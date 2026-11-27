// Trusted server operator only. Print the random, phone-bound invitation once.
import 'dotenv/config';
import pg from 'pg';
import {normalizePhone} from './lib/phone-auth.mjs';
import {randomToken,sha256} from './lib/security.mjs';
const phone=normalizePhone(process.argv[2]),slug=process.argv[3];
if(!phone||!slug||!process.env.DATABASE_URL){console.error('Usage: npm run auth:invite -- +989xxxxxxxxx restaurant-slug');process.exit(1);}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
try {
  const token=randomToken(32);
  const result=await pool.query(`insert into phone_auth_invites(digest,phone,restaurant_id,expires_at)
    select $1,$2,id,now()+interval '24 hours' from restaurants where slug=$3
    and not exists(select 1 from users where phone=$2) returning digest`,[sha256(token),phone,slug]);
  if(result.rowCount!==1)throw new Error('No eligible invitation target.');
  console.log(token);
} finally {await pool.end();}
