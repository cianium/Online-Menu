# RAMEN — Ürün ve kullanıcı rehberi

[Tüm diller](README.md) · [English](en.md) · [فارسی](fa.md) · [العربية](ar.md)

## Yeni bir restoran deneyimi

RAMEN, mobil öncelikli dijital menü ve restoran yönetim alanıdır. Misafirler görsel kataloğu keşfeder; ekip ürünleri, kategorileri ve fiyatları yönetir. Farsça ve Arapça sağdan sola, İngilizce ve Türkçe soldan sağa desteklenir. QR ile sipariş, mutfak ekranı ve şube ödemeleri bağımsız demodan ayrı, bağlantılı çalışma moduna aittir.

## Demoyu başlatın

Git ve Node.js 22 veya üzeri kurulu olmalıdır:

```bash
git clone https://github.com/cianium/Online-Menu.git
cd Online-Menu
npm run demo
```

Aynı tarayıcı profilinde [misafir menüsünü](http://127.0.0.1:8765/) ve [yönetim panelini](http://127.0.0.1:8765/admin/) açın. Veritabanı, bulut hesabı veya API anahtarı gerekmez. Yerel sunucuyu Ctrl+C ile durdurun.

## Misafir rehberi

1. Dilinizi seçin ve kategorileri inceleyin.
2. Bir yemek arayın, filtreleri kullanın ve ürün ayrıntılarını açın.
3. Favorileri ve sepeti deneyin; demo gerçek sipariş veya ödeme yapmaz.
4. Yapılandırılmış bir restoranda imzalı masa QR kodunu kullanın ve mevcut sipariş/ödeme adımlarını izleyin. Belirsiz ödeme durumunu personele sorun.

## Yönetici rehberi

1. Yönetim panelini açıp demo modu göstergesini kontrol edin.
2. Ürünler bölümünde örnek yemek ekleyin: kategori, ad ve fiyat belirleyip kaydedin.
3. Kategorileri ve restoran ayarlarını inceleyin; yalnızca örnek veri kullanın.
4. Misafir sekmesine dönün, katalog güncellemesini kontrol edin ve iki sekmeyi yenileyin.
5. Temiz bir sunum için ayrı tarayıcı profili kullanın veya ilgili sitenin verilerini temizleyin; yerel değişiklikler silinir.

## Bağlantılı işletim

Ayrı yapılandırılmış bir ortamda yetkili personel şube/masa QR bağlantılarını, sipariş kuyruğunu ve mutfak ekranını yönetebilir. Para birimi eşlemesi, masalar ve şube özellik bayrakları gereklidir. Ödeme için tanımlı üye iş yeri ve test ortamında doğrulanmış geri çağrı gerekir. Tek başına tarayıcı yanıtı ödeme kanıtı değildir.

## Sınırlar ve sonraki adım

Demo değişiklikleri aynı tarayıcı ve origin içinde kalır; gerçek kimlik doğrulama, ortak veritabanı, sipariş gerçekleştirme ve ödeme yoktur. Google Fonts isteği oluşabilir; erişim yoksa alternatif yazı tipleri kullanılır. Müşteri verisi veya parola girmeyin. Açıkça belirtilen bilinmeyen restoran için örnek menü gösterilmemelidir.

Gelecekte özel VPS sunumu için `npm run demo:export` komutuyla paket oluşturun, SHA-256 manifestini doğrulayın ve iki arayüz için HTTPS ile erişim kontrolünü yapılandırın. [Yerel demo](../DEMO_LOCAL.md), [VPS rehberi (FA)](../VPS_DEMO_FA.md) ve [yayın koşulları (FA)](../DEPLOY_VQ3_FA.md) belgelerine bakın. Bu rehber üretim ortamının çalıştığını doğrulamaz.

[Ürün kataloğu](PRODUCT.md) · [Mühendislik](ENGINEERING.md)
