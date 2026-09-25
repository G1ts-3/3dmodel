# Spectrophotometer UV-Vis — Laboratorium Interaktif

Aplikasi pembelajaran satu halaman dengan model 3D interaktif, tujuh penanda komponen, dan **animasi penggunaan langsung pada model**. Berkas `spectrophotometer.glb` sudah disertakan.

Pada desktop dan tablet lebar (mulai 980 px), viewer 3D dan **02 / Simulasi** tampil berdampingan. Petunjuk langkah dan konsol berada di panel kanan agar pengukuran dapat dikendalikan tanpa berpindah ke bagian bawah halaman. Di layar sempit, tata letaknya kembali vertikal.

## Jalankan lokal

Jalankan server statis dari folder ini:

```sh
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000/`. Gunakan server HTTP agar berkas GLB dimuat dengan benar.

## Simulasi pada model 3D

1. Pilih tab **Simulasi 3D** di kiri atas viewer. Tekan **Putar demo lengkap** di panel kanan untuk menyaksikan satu urutan otomatis, atau tekan tombol fisik **POWER → BLANK → UKUR** pada panel model 3D. Tombol konsol di sebelah model melakukan tindakan yang sama.
2. **Power** menekan tombol fisik, menyalakan LED hijau serta LCD pada model.
3. **Blank** membuka penutup, mengangkat kuvet blank, menggeser dudukan tiga kuvet, menurunkan blank ke jalur optik, menutup penutup, menyalakan gambaran cahaya dan detektor, lalu menetapkan 0.000 Abs atau 100.0%T.
4. **Ukur** membuka penutup, mengangkat dan menurunkan kuvet sampel berwarna pada dudukan, menutup penutup, lalu memperlihatkan cahaya yang diteruskan ke detektor dan nilai pembacaan pada LCD model serta konsol.
5. Geser panjang gelombang dalam rentang 200–1100 nm untuk mengulang kalibrasi blank. Tombol **Abs** dan **%T** mengubah satuan hasil. Tombol buka/tutup ruang sampel menggerakkan engsel secara manual.

Tab **Bagian alat** menampilkan tujuh hotspot bernomor beserta penjelasan anatomi. Ketiga tombol fisik merupakan bagian permanen dari model alat. Area klik transparannya hanya aktif pada **Simulasi 3D**, sehingga tidak ada tombol tambahan yang menutupi penanda bagian. Seret model untuk memutar, gulir untuk zoom, pilih hotspot atau panah navigasi untuk fokus, dan klik area kosong untuk mengatur ulang kamera. Perputaran kamera dan tiap tahap animasi 3D memakai gerak yang dipercepat dan diperlambat secara bertahap.

Keypad GLB asli yang memuat tombol **Print, Set, Zero, Goto,** dan tombol panah telah dilepas dari hierarki model. Sebagai penggantinya, tiga tombol 3D timbul dengan label yang benar **POWER, BLANK, UKUR** tertanam pada panel. Pusat area klik transparan tepat pada pusat geometri tombol; animasi menekan tombol menggerakkan tombol fisik tersebut. Tekstur LCD menggantikan seluruh permukaan layar asli model sehingga tidak menyisakan tampilan lama di tepinya. LCD model memakai angka besar, latar gelap, dan arah baca normal dari posisi operator; LCD konsol di samping menunjukkan data yang sama. Engsel penutup diposisikan ulang agar kulit tutup berada di atas bibir ruang sampel ketika tertutup.

Saat pembacaan, penutup tetap tertutup tetapi kulit penutup sementara dibuat tembus pandang untuk memperlihatkan **visualisasi edukatif** lintasan cahaya. Warna cahaya ini bukan tampilan cahaya UV yang sebenarnya. Model asal tidak merinci komponen lampu dan sensor di dalam ruang sampel; penanda kedua komponen menunjukkan letaknya pada jalur optik. Nilai simulasi menggunakan kurva serapan ilustratif dengan puncak sekitar 540 nm dan sedikit variasi acak, bukan hasil eksperimen yang layak dipakai untuk analisis laboratorium.

## Kredit model

Model *Spectrophotometer* oleh [HoneyBadgersTail](https://sketchfab.com/3d-models/spectrophotometer-4f280b451be843138255c3c9874f444d), tersedia di bawah [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Berkas GLB di sini merupakan adaptasi yang menambahkan animasi penutup, kuvet kaca, dudukan kuvet, tombol, lampu indikator, lintasan optik, dan permukaan LCD. Atribusi juga tercantum pada halaman aplikasi.
