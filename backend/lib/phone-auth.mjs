import { createHmac, randomInt } from 'node:crypto';
import { httpError } from './http.mjs';
import { randomToken, safeEqual, sha256 } from './security.mjs';

export function normalizePhone(raw) {
  if (typeof raw !== 'string' || raw.length > 40) return null;
  let value=raw.trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[\s()-]/g,'');
  if (value.startsWith('00')) value='+'+value.slice(2);
  if (/^09\d{9}$/.test(value)) value='+98'+value.slice(1);
  return /^\+[1-9]\d{7,14}$/.test(value)?value:null;
}
export function normalizeName(raw) {
  if(typeof raw!=='string')return null;
  const value=raw.trim().normalize('NFC');
  return value.length>=2&&value.length<=80&&!/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\u200c\u200d]/g,''))?value:null;
}
export function otpDigest(secret, challenge, phone, code) {
  return createHmac('sha256',secret).update(JSON.stringify([challenge,phone,code])).digest('hex');
}
export function phoneAuthConfig(env) {
  if(env.PHONE_AUTH_ENABLED!=='true') return {enabled:false};
  const secret=env.PHONE_AUTH_SECRET||'', token=env.PHONE_AUTH_SMS_TOKEN||'';
  let url;
  try {url=new URL(env.PHONE_AUTH_SMS_URL||'');}catch{}
  if(secret.length<32||token.length<16||!url||url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw new Error('Phone authentication requires a strong server secret and configured HTTPS SMS adapter.');
  return {enabled:true,secret,token,url:url.href,allowLegacyPassword:env.PHONE_AUTH_LEGACY_PASSWORD==='true'};
}
export async function sendPhoneOtp(config,phone,code,fetcher=fetch) {
  const response=await fetcher(config.url,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.token},body:JSON.stringify({phone,code,purpose:'login',expiresIn:300})});
  if(!response.ok) throw new Error('SMS adapter rejected request');
}
const invalid=()=>httpError(400,'Invalid phone or registration details.','PHONE_AUTH_INVALID');
const unavailable=()=>httpError(503,'Phone sign-in is not configured.','PHONE_AUTH_UNAVAILABLE');
const badCode=()=>httpError(401,'Code invalid or expired.','PHONE_AUTH_CODE_INVALID');
const limited=()=>httpError(429,'Too many attempts. Try again later.','PHONE_AUTH_RATE_LIMIT');
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export function registerPhoneAuth(api,{config,db,transaction,issueSession,deliver=sendPhoneOtp}) {
  api.get('/auth/phone/status',async()=>({data:{enabled:config.enabled},error:null}));
  const enabled=()=>{if(!config.enabled)throw unavailable();};
  const phoneOf=request=>{const phone=normalizePhone(request.body?.phone);if(!phone)throw invalid();return phone;};
  // Counters are atomic and database-backed; secret hashes avoid storing raw IPs in counters.
  async function consume(client,key,max,windowSeconds){
    const digest=createHmac('sha256',config.secret).update(key).digest('hex');
    const result=await client.query(`insert into phone_auth_limits(key,window_start,hits) values($1,now(),1)
      on conflict(key) do update set window_start=case when phone_auth_limits.window_start <= now()-make_interval(secs=>$2) then now() else phone_auth_limits.window_start end,
      hits=case when phone_auth_limits.window_start <= now()-make_interval(secs=>$2) then 1 else least(phone_auth_limits.hits+1,$3+1) end returning hits`,[digest,windowSeconds,max]);
    return result.rows[0].hits<=max;
  }
  const response=(data,request)=>({data,error:null,requestId:request.id});
  api.post('/auth/phone/lookup',{bodyLimit:2048,config:{rateLimit:{max:15,timeWindow:'10 minutes'}}},async(request)=>{
    enabled();const phone=phoneOf(request);
    const allowed=await transaction(async client=>consume(client,'lookup-ip:'+request.ip,20,600));
    if(!allowed)throw limited();
    const user=(await db('select id from users where phone=$1',[phone])).rows[0];
    // The requested phone-first UX discloses registration existence, never role or account data.
    return response({needsName:!user},request);
  });
  api.post('/auth/phone/start',{bodyLimit:4096,config:{rateLimit:{max:10,timeWindow:'10 minutes'}}},async(request)=>{
    enabled();const phone=phoneOf(request),name=normalizeName(request.body?.name);
    const invite=request.body?.accessKey;
    if(invite!==undefined&&invite!==''&&(typeof invite!=='string'||!tokenPattern.test(invite)))throw invalid();
    const inviteHash=invite?sha256(invite):null;
    const challenge=randomToken(32),digest=sha256(challenge),code=String(randomInt(0,1000000)).padStart(6,'0');
    const result=await transaction(async client=>{
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['phone:'+phone]);
      const ipAllowed=await consume(client,'send-ip:'+request.ip,15,900);
      const phoneAllowed=await consume(client,'send-phone:'+phone,5,900);
      if(!ipAllowed||!phoneAllowed)return 'rate';
      const recent=(await client.query("select 1 from phone_auth_challenges where phone=$1 and created_at>now()-interval '60 seconds' limit 1",[phone])).rows[0];
      if(recent)return 'rate';
      const existing=(await client.query('select id,active from users where phone=$1',[phone])).rows[0];
      if(existing&&!existing.active)return 'invalid';
      if(existing&&inviteHash)return 'invalid'; // no self-service upgrade of a customer account
      if(!existing&&!name)return 'name';
      if(inviteHash){
        const valid=(await client.query('select 1 from phone_auth_invites where digest=$1 and phone=$2 and consumed_at is null and expires_at>now()',[inviteHash,phone])).rows[0];
        if(!valid)return 'invalid';
      }
      await client.query('update phone_auth_challenges set consumed_at=now() where phone=$1 and consumed_at is null',[phone]);
      await client.query("insert into phone_auth_challenges(digest,phone,otp_digest,display_name,invite_digest,expires_at) values($1,$2,$3,$4,$5,now()+interval '5 minutes')",[digest,phone,otpDigest(config.secret,digest,phone,code),existing?null:name,inviteHash]);
      return 'ok';
    });
    if(result==='rate')throw limited();
    if(result==='name')throw httpError(409,'Registration details required.','PHONE_AUTH_NAME_REQUIRED');
    if(result!=='ok')throw invalid();
    try{await deliver(config,phone,code);}catch{
      await db('update phone_auth_challenges set consumed_at=now() where digest=$1',[digest]);
      throw httpError(503,'Could not send verification code.','PHONE_AUTH_SEND_FAILED');
    }
    return response({challenge,expiresIn:300,resendAfter:60},request);
  });
  api.post('/auth/phone/verify',{bodyLimit:2048,config:{rateLimit:{max:20,timeWindow:'10 minutes'}}},async(request,reply)=>{
    enabled();
    const challenge=request.body?.challenge,code=request.body?.code;
    if(typeof challenge!=='string'||!tokenPattern.test(challenge)||typeof code!=='string'||!/^\d{6}$/.test(code))throw badCode();
    const digest=sha256(challenge);
    const result=await transaction(async client=>{
      if(!await consume(client,'verify-ip:'+request.ip,30,900))return {error:'rate'};
      const lookup=(await client.query('select phone from phone_auth_challenges where digest=$1',[digest])).rows[0];
      if(!lookup)return {error:'code'};
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',['phone:'+lookup.phone]);
      const row=(await client.query('select *,expires_at>now() as valid from phone_auth_challenges where digest=$1 for update',[digest])).rows[0];
      if(!row||!row.valid||row.consumed_at||row.attempts>=5)return {error:'code'};
      if(!safeEqual(row.otp_digest,otpDigest(config.secret,digest,row.phone,code))){
        await client.query('update phone_auth_challenges set attempts=attempts+1 where digest=$1',[digest]);
        return {error:'code'};
      }
      let user=(await client.query('select id,email,display_name,active from users where phone=$1 for update',[row.phone])).rows[0];
      // An account created since this challenge started must not be elevated or renamed.
      if(user&&(!user.active||row.invite_digest||row.display_name))return {error:'code'};
      if(!user){
        if(!row.display_name)return {error:'code'};
        let invitation;
        if(row.invite_digest){
          invitation=(await client.query('select restaurant_id from phone_auth_invites where digest=$1 and phone=$2 and consumed_at is null and expires_at>now() for update',[row.invite_digest,row.phone])).rows[0];
          if(!invitation)return {error:'code'};
        }
        user=(await client.query('insert into users(phone,display_name) values($1,$2) returning id,email,display_name,active',[row.phone,row.display_name])).rows[0];
        if(invitation){
          await client.query("insert into restaurant_memberships(restaurant_id,user_id,role) values($1,$2,'manager')",[invitation.restaurant_id,user.id]);
          await client.query('update phone_auth_invites set consumed_at=now() where digest=$1',[row.invite_digest]);
        }
      }
      await client.query('update phone_auth_challenges set consumed_at=now() where digest=$1',[digest]);
      const admin=(await client.query('select 1 from restaurant_memberships where user_id=$1 limit 1',[user.id])).rowCount>0;
      const session=await issueSession(client,user,request);
      return {session,user,role:admin?'admin':'customer'};
    });
    if(result.error==='rate')throw limited();
    if(result.error)throw badCode();
    result.session.setCookies(reply);
    return response({user:{id:result.user.id,displayName:result.user.display_name},role:result.role,csrfToken:result.session.csrf},request);
  });
}
