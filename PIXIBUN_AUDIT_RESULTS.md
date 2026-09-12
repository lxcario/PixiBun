# PIXIBUN — Derin Kod ve Dokümantasyon Denetimi Sonuçları

Tarih (UTC): 2026-09-12. Denetçi: dışarıdan şüpheci kıdemli denetçi. Yöntem: diskteki gerçek durum, bizzat okuma + bizzat çalıştırma + birincil harici kaynak. Kanıt etiketi olmayan cümle bu raporda hüküm bildirmez.

## 1. Özet — sadece rakamlar

- Taranan depo (node_modules, .git, .next hariç): 421 dosya. [ÇALIŞTIRMA] `node audit-inv.cjs` çıktısı: `TOTAL_FILES_EXCL_DEPS=421`.
- `src/` altında kod dosyası: 195 adet `.ts/.tsx/.css` (4 font `.woff2` ve 1 `.svg` dahil 200). Toplam satır: 50.243. [ÇALIŞTIRMA] `node audit2.cjs`: `SRC_CODE_FILES=195 TOTAL_LINES=50243`.
- En büyük 5 kaynak: `src/lib/art/playgroundLessons.ts` 1617, `src/components/landing/AtelierDeskScene.tsx` 1449, `src/lib/ai/math/photometricLighting.ts` 1232, `src/components/layout/StudioLayout.tsx` 910, `src/lib/audio/lofiRadio.ts` 884. [ÇALIŞTIRMA]
- Vitest birim/entegrasyon: 80 suite, 558 test; hepsi geçti. [ÇALIŞTIRMA] `npm test` son satırları: `Test Files 80 passed (80)`, `Tests 558 passed (558)`, süre 6.34s.
- Playwright E2E: 8 spec dosyası, `test(` çağrısı sayımıyla 20 test (1+2+1+1+4+1+9+1). [KOD-OKUMA] E2E bu oturumda çalıştırılmadı.
- Birincil `.md` envanteri (proje kökü + `docs/` + `.agents/`, `node_modules` ve `testsprite_tests/tmp` kopyaları hariç): 18 dosya. [ÇALIŞTIRMA] dosya yürüyüşüyle sayıldı. Liste bölüm 3-4'teki dosya adlarından izlenebilir. `testsprite_tests/tmp/prd_files/` altındaki 3 kopya + `raw_report.md` eski kopyalardır, ayrıca işaretlendi.
- `node scripts/verifyDocIntegrity.mjs`: 6 kontrolün 6'sı geçti. [ÇALIŞTIRMA] Çıktı: TASKS 45 faz benzersiz; ARCHITECTURE 1-23 monoton; CHANGELOG 170/170 yol diskte; CenterViewport 759 satır; README metrikleri canlı koşuculara karşı 80 suite/558 test ve 8 suite/20 E2E; package.json–CHANGELOG sürüm eşleşmesi 1.12.1.
- `npm run typecheck` (`tsc --noEmit`): sıfır hata. [ÇALIŞTIRMA]
- `npm run lint` (`eslint src tests`): sıfır hata, sıfır uyarı. [ÇALIŞTIRMA]
- `npm run build` (Next 16.3.4 Turbopack): başarılı. [ÇALIŞTIRMA] Rotalar: `/`, `/_not-found`, `/api/diagnostics/relay`, `/icon.svg`, `/playground`, `/studio`, `/sw.js` + Proxy.
- Bulgu sayımı (bu raporun ataması): Kritik 1, Yüksek 4, Orta 7, Düşük 5, Kozmetik 2. Doğrulanamayan/şüpheli: 3 kalem.

## 2. Kritik ve Yüksek Öncelikli Buglar

### K-1. `getIsometric2p1Line` bitiş noktasını ıskalıyor — Kritik [KOD-OKUMA]

- Dosya:satır: `src/lib/ai/math/curvesAndLines.ts:51-107`.
- Kod: `numSteps = Math.max(1, Math.round(Math.abs(dx) / 2))`, sonra `curX1 = x0 + k*2*sx`, `curY = y0 + k*sy`. Fonksiyon `dy`'yi hiç kullanmıyor (`sy` işareti hariç).
- Tetikleme: `getIsometric2p1Line(0, 0, 10, 2)` yine `numSteps=5` üretir ve `(10,5)` civarında biter; istenen `(10,2)` üretilmez. `getIsometric2p1Line(0, 0, 3, 10)` en fazla `(4,2)` civarında durur. Genel doğru-parçası değil, `dy`'den bağımsız sabit 2:1 desen üretecidir.
- Test boşluğu: `tests/curvesAndLines.test.ts:60-99` yalnızca `(0,0)->(10,5)`, sıfır-uzunluk, saf dikey ve saf yatay durumları test eder. Rastgele bitiş-noktası testi yoktur.
- Doküman etkisi: `README.md:34`, `MAIN.md:11`, `ARCHITECTURE.md:37` bu fonksiyonu genel izometrik doğru aracı gibi sunar.

### Y-1. Export ölçeği sekmeler arasında paylaşılıyor — Yüksek [KOD-OKUMA]

- Dosya:satır: `src/components/modals/ExportModal.tsx:58` (tek `scale` state), `:103-111` (yalnızca `Math.min` kırpma), kullanımlar `:640-720` (tüm sekmeler aynı çifti alır).
- Tetikleme: PNG sekmesinde 32x seç, GIF sekmesine geç — yalnızca `Math.min(prev, 8)` uygulanır. PNG'ye dönünce 8x'te kalınır.
- Çelişki: `TASKS.md:14` ("Isolated and clamped scale ... does not bleed") ve `ARCHITECTURE.md:490` ("per-tab export scale states are fully isolated") kodla çelişir.
- İkincil: `TASKS.md:10` ölçek tavanları kısmen doğru (GIF `[1,2,4,8]`, spritesheet `[1,2,4]`, APNG/WebM/MP4 `[1,2,4,8,16]`, PNG `[1,2,4,8,16,32]`), fakat palette-cycle `[1,2,4,8]` ile sınırlıdır (`ShaderExportTab.tsx:76`). 4096px/16.7MP UI koruması yalnızca PNG sekmesindedir; yalnızca PNG çalıştırma yolu abort eder (`ExportModal.tsx:118-130`).

### Y-2. `scale2x` sınır pikselleri saydam komşu sayar — Yüksek [KOD-OKUMA]

- Dosya:satır: `src/lib/canvas/rotSprite.ts:49-52` (`getPx` sınır-dışı `0`) + `:29` (`a1<16 && a2<16` ise mesafe 0).
- Etki: opak kenar piksellerinde kural yanlış tetiklenebilir. RotSprite testleri opak-kenar regresyonu içermez.

### Y-3. `parseCRNG` içinde açıklanmayan `rateRaw !== 36` sihri — Yüksek [KOD-OKUMA]

- Dosya:satır: `src/lib/color/paletteCycling.ts:45`, `:48-49`, `:56`.
- Gerekçe kodda/testte/dokümanda yoktur. `serializeCRNG` (`:66-86`) dışlamayı bilmez. Yuvarlama parse→serialize döngüsünü kayıplı yapar.

### Y-4. Arşiv kopyalar güncel belgelerle çelişiyor — Yüksek [KOD-OKUMA]

- `testsprite_tests/tmp/prd_files/ARCHITECTURE.md:447` "Farey Rational Retuning" der; güncel `ARCHITECTURE.md:460` "Harmonic Rational Retuning" der. "Farey" kodda hiç geçmez.
- `testsprite_tests/tmp/prd_files/PIXIBUN_DEEP_DIVE.md:122` "Rational Bezier Curves" der; güncel belgeler "Quadratic Bézier" der.
- `testsprite_tests/tmp/prd_files/README.md:34` "Wu's 2:1 Iso Lines" ve "Rational Bézier Splines" der; güncel README içermez.
- `scripts/verifyDocIntegrity.mjs:1-10` yalnızca 6 kontrol yapar; arşiv kapsam dışındadır.



## 3. Dokümantasyon Yalanları/Hataları — dosya bazında

1. `README.md:44` — "sprite model switching (Ghost, Shroom, Bun, Lantern)" [KOD-OKUMA] Yanlış. `PhotometricShowcase.tsx:23` yalnızca `STARTER_TEMPLATES` kullanır; bu seçici yoktur. `RotSpriteShowcase.tsx:10` (`sword|ghost|bun`) farklı vitrindir.
2. `README.md:44` — "material profiles (Matte, Gold, Glass, Fabric)" [KOD-OKUMA] Eksik. Kodda 5 profil vardır (`photometricLighting.ts:50-91`: matte, metal, gold, glass, fabric); UI 5'ini de gösterir (`PhotometricLightingSection.tsx:23-55`).
3. `README.md:45` — "standard blurry bicubic filtering" [KOD-OKUMA] Yanlış. `RotSpriteShowcase.tsx:48-60` karşılaştırma dalı `imageSmoothingEnabled=false` + canvas rotate kullanır.
4. `README.md:60-71` — araç listesi [KOD-OKUMA] Kısmen yanlış: "Blue-Noise Dither" bağımsız araç değil, fırça matrisi seçeneğidir (`types/tools.ts:19`). "Normal Chisel (K) & Rivet (Shift+K)" yazılır; `PIXIBUN_DEEP_DIVE.md:419-420` tersini söyler (N/rivet, K/chisel).
5. `README.md:85` + `ARCHITECTURE.md:59-70` — canvas sayımı [KOD-OKUMA] Tutarsız. `CenterViewport.tsx:644-696` içinde 6 `<canvas>` etiketi vardır; ARCH L0 arka planını da katarak 7 katman etiketi sayar.
6. `README.md:240` — "minimum target hit sizes (>=24px)" [ŞÜPHELİ/DOĞRULANAMADI] Genel 24px denetimi kodda bulunamadı.
7. `README.md:250` — "React Compiler memoization" [ŞÜPHELİ/DOĞRULANAMADI] `next.config.ts`, `package.json` ve kaynakta kanıt bulunamadı.
8. `ARCHITECTURE.md:33` — "50-Step History Ring" [KOD-OKUMA] Yanıltıcı. `historyEngine.ts:24` yalnızca undo içindir; redo ayrıca 50 tutulur (`:39-61`). Gerçek kapasite 100'dür.
9. `ARCHITECTURE.md:453`, `PIXIBUN_DEEP_DIVE.md:331` — "16384=60Hz / Full parsing" [KOD-OKUMA] Kodla tutarlı, fakat birincil Amiga kaynağıyla doğrulanamadı [ŞÜPHELİ/DOĞRULANAMADI]; Y-3 nedeniyle "Full" abartılıdır.
10. `MAIN.md:15` — "frontal face cushion plateau (Nz>=0.85)" [KOD-OKUMA] Kodda `0.85` yoktur; bulunanlar `0.88` ve `0.78` alt-sınırlarıdır.
11. `MAIN.md:21` — "32x for sprites up to 128x128" [KOD-OKUMA] Yalnızca kare kanvas için doğru. Dikdörtgende 16x bile tek-eksen kuralına takılır (`exportCanvasScaleBounds.test.ts:59-73`).
12. `BENCHMARKS.md:26,79,107` — "comfortably holds / completely preventing / guaranteeing" [KOD-OKUMA] Abartılı; CI yalnızca üst-sınır denetler.
13. `CHANGELOG.md:15`, `TASKS.md:16`, `LOGS.md:1424` — "Corrected ... across all files" [KOD-OKUMA] Yanlış. `src/lib/ai/smartMathEngine.ts:18` hâlâ "Rational Bézier Curves" yazmaktadır.
14. `docs/plans/implementation_plan.md:91` — `public/sw.js` anlatımı [KOD-OKUMA] Güncel-değil. Gerçek SW `src/app/sw.js/route.ts` yolundan üretilir.
15. `SECURITY.md` — röle korumaları (12/dk, 64KB, 100-olay, HTTPS; `route.ts:7-14,44-59`) anlatılmaz [KOD-OKUMA]. Eksik-belge.
16. `.env.example:5-6` — `ghp_` önekli örnekler [KOD-OKUMA]. Düşük risk.
17. `FullStackGuide.md:42-46` — kullanılmayan yığın satırları [KOD-OKUMA]. Genel protokol belgesidir.

## 4. Dokümante Edilmemiş Kod Davranışları

1. Paylaşılan `scale` durumu kısıt olarak yazmaz. [KOD-OKUMA]
2. `MAX_SAFE_*` UI korumasının yalnızca PNG sekmesinde olması belgelenmez. [KOD-OKUMA]
3. `parseCRNG` 36-dışlama ve hız yuvarlaması belgelenmez. [KOD-OKUMA]
4. Redo kapasitesi (50) belgelenmez. [KOD-OKUMA]
5. `WallpaperGroup` yalnızca 6 değer alır (`types/tools.ts:90`); "17 grup" anlatımı yalnızca 5 altgrubun modellendiğini yazmaz. [KOD-OKUMA]
6. `CrdtPixelBuffer.merge` boyut uyuşmazlığında throw eder (`crdtPixelBuffer.ts:381-384`). [KOD-OKUMA]
7. `getOpsSince` budama sonrası sessizce eksik döndürür (`crdtPixelBuffer.ts:353-366`). [KOD-OKUMA]
8. `diffImageDataToOps` boyut değişiminde boş dizi döner (`strokeDiff.ts:27-32`). [KOD-OKUMA]
9. Misafir yapısal düzenlemelerinin ezildiği yalnızca kod yorumundadır (`coDrawBridge.ts:13-16`). [KOD-OKUMA]
10. MP4/WebM `loopCount` varsayılanı 2'dir (`mp4Encoder.ts:78`, `webmEncoder.ts:37`); yazmaz. [KOD-OKUMA]
11. H.264 çift-boyut doldurması yalnızca MP4 yolundadır (`mp4Encoder.ts:81-82`); WebM'de yoktur. [KOD-OKUMA]


## 5. Algoritma/Atıf Doğrulama Tablosu

| Teknik | Kod/doküman iddiası | Gerçek kaynak | Hüküm |
|---|---|---|---|
| Scale2x/EPX (Johnston 1992) | `rotSprite.ts:6`, vitrin "Johnston 1992" | https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms | [WEB-DOĞRULAMA] İsim/yıl eşleşiyor; sınır-dışı `0` seçimi kanonik tanıma dahil değildir (Y-2). |
| RotSprite (Xenowhirl 2007) | 3-geçiş 8x + ters-eşleme + çoğunluk oylaması | Aynı sayfadaki RotSprite bölümü | [WEB-DOĞRULAMA] Mimari eşleşiyor; "distortion-free" mutlaklığı abartılı. |
| Felzenszwalb-Huttenlocher EDT | "O(W*H) exact 2D", "2012 Theory of Computing; Cornell TR 2004" (`edtNormalMap.ts:5-7`) | https://en.wikipedia.org/wiki/Distance_transform | [WEB-DOĞRULAMA] Yıl/dergi eşleşiyor. |
| Kopf-Lischinski (SIGGRAPH 2011, TOG 30(4):99) | `depixelizeVector.ts:4-7` tam künye | Wikipedia Depixelization 404; ACM kaydı açılamadı | [ŞÜPHELİ/DOĞRULANAMADI] Uydurulmadı fakat doğrulanamadı. Implementasyon basitleştirilmiş sezgiseldir. |
| OKLab/OKLCH (Ottosson 2020) | `colorSpace.ts:4` | https://en.wikipedia.org/wiki/Oklab_color_space | [WEB-DOĞRULAMA] Yıl/yazar eşleşiyor; katsayılar bit-bit karşılaştırılmadı. |
| Bayer (1973, IEEE ICC) | `dithering.ts:5-6`, matrisler `ditherMatrix.ts:14-35` | https://en.wikipedia.org/wiki/Ordered_dithering | [WEB-DOĞRULAMA] Yıl/mekan/matris eşleşiyor. |
| Ulichney void-and-cluster (1993) | `ditherMatrix.ts:5-6` | Aynı sayfadaki Ulichney kaynağı | [WEB-DOĞRULAMA] Yıl/yazar eşleşiyor; tam döngü doğrulanmadı. |
| Atkinson (1984) / Riemersma (1998) / Zhang-Suen (1984) | İlgili dosya başlıkları | Birincil kaynak açılamadı | [ŞÜPHELİ/DOĞRULANAMADI] Kod benziyor; künye doğrulanamadı. |
| WFC (Gumin 2016) + Merrell (2007/2008/2009) | `waveFunctionCollapse.ts:5-6` | https://en.wikipedia.org/wiki/Wave_function_collapse_(algorithm) | [WEB-DOĞRULAMA] Yıl/yazar eşleşiyor. Garanti yalnızca başarılı dönüş içindir (`:444-452`). |
| Renk-döngüsü (Ferrari; CRNG/CCRT) | `paletteCycling.ts:3-9`, `16384=60Hz` | https://en.wikipedia.org/wiki/Color_cycling | [WEB-DOĞRULAMA] Ferrari eşleşiyor; CRNG/CCRT düzeni doğrulanamadı. |
| CRDT (Shapiro vd. SSS 2011) | `crdtPixelBuffer.ts:6-19` | https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type | [WEB-DOĞRULAMA] Yıl/yazar eşleşiyor. HLC künyesi doğrulanamadı. SEC yalnızca piksel-durumu içindir. |
| Token-bucket (Tanenbaum; RFC 2697) | `tokenBucket.ts:3-6` | Açılamadı | [ŞÜPHELİ/DOĞRULANAMADI] Algoritma standart, testler yeşil; künye doğrulanamadı. |
| Diger isik-fizigi ve telif atıfları | İlgili başlıklar | Tek-tek açılmadı | [ŞÜPHELİ/DOĞRULANAMADI] Uydurulmadı; kapatılamadı. "Physically accurate" abartılıdır. |

## 6. Test/Build Sağlık Durumu — gerçek komut çıktıları

- `node scripts/verifyDocIntegrity.mjs` [ÇALIŞTIRMA]: 45 faz benzersiz; 1-23 monoton; 170/170 yol; CenterViewport 759 satır; 80 suite/558 test + 8 suite/20 E2E; sürüm 1.12.1. 6/6 geçti.
- `npm run typecheck` [ÇALIŞTIRMA]: sıfır hata.
- `npm run lint` [ÇALIŞTIRMA]: sıfır hata/sıfır uyarı.
- `npm test` [ÇALIŞTIRMA]: `Test Files 80 passed (80)`, `Tests 558 passed (558)`, `Duration 6.34s`.
- `npm run build` [ÇALIŞTIRMA]: `Compiled successfully in 763ms`, TypeScript 1829ms, static 8/8.
- E2E çalıştırılmadı; "E2E geçti" hükmü verilemez.
- Test-anlamlılığı [KOD-OKUMA]: benchmark gerçek bütçe denetler; RotSprite 0-yeni-renk test eder; p2p/token/export hedeflidir. K-1 boşluğu ve cvdLens döngüsellik riski durur.

## 7. Doğrulanamayan/Şüpheli Bulgular

1. E2E/Lighthouse yeşilliği [ŞÜPHELİ/DOĞRULANAMADI] — çalıştırılmadı.
2. Sahada sub-16ms çizim [ŞÜPHELİ/DOĞRULANAMADI] — ölçülmedi.
3. Tabloda işaretli atıflar [ŞÜPHELİ/DOĞRULANAMADI] — uydurulmadı, kapatılamadı.

## 8. Önerilen Düzeltmeler — önem sırasına göre

1. Kritik — `getIsometric2p1Line` düzeltme veya sözleşme daraltma (`curvesAndLines.ts:51-107`).
2. Yüksek — Export `scale` izolasyonu veya doküman düzeltme (`ExportModal.tsx:58,103-111,640-720`); diğer sekmelere tavan göstergesi.
3. Yüksek — `scale2x` sınır koşulu (`rotSprite.ts:49-52`); opak-kenar testi.
4. Yüksek — `parseCRNG` sihri (`paletteCycling.ts:45,56`); döngü testi.
5. Yüksek — Arşiv kopyaları silme/denetime alma (`testsprite_tests/tmp/prd_files/`).
6. Orta — "Rational Bézier" kalıntısı (`smartMathEngine.ts:18`).
7. Orta — README vitrin cümleleri (modeller, 5 malzeme, bicubic, canvas sayımı).
8. Orta — Kısayol çelişkisi (`README.md:69` vs `PIXIBUN_DEEP_DIVE.md:419-420`).
9. Orta — `MAIN.md:15` sayısı (0.85 → 0.88/0.78 veya kaldırma).
10. Orta — `MAIN.md:21` dikdörtgen uyarısı.
11. Orta — WFC garanti cümlesi (`waveFunctionCollapse.ts:12`).
12. Orta — Depikselleme başlığı (`depixelizeVector.ts:1-12`).
13. Düşük — APNG "W3C" ifadesi (`apngEncoder.ts:4-6`).
14. Düşük — `.env.example` örnekleri.
15. Düşük — `SECURITY.md` röle korumaları.
16. Düşük — `BENCHMARKS.md` mutlaklıkları.
17. Düşük — `LOGS.md` tarihsel-kayıt notu.
18. Kozmetik — SW yolu (`implementation_plan.md:91`).
19. Kozmetik — E2E sayım yöntemi notu.
