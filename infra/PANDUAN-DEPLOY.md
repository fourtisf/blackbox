# Panduan deploy Blackbox ke VPS (tahap pra-peluncuran)

Panduan ini memasang **website (data demo) dan API daftar tunggu** di VPS Hostinger, dengan domain dan HTTPS.
Recorder, indexer dan kontrak belum ikut; mereka menyusul di Milestone 3 sampai 5.

Waktu yang dibutuhkan: sekitar 30 menit, kebanyakan menunggu instalasi.

---

## 1. Yang perlu disiapkan

1. **VPS Ubuntu 24.04** (22.04 juga bisa). Untuk pra-peluncuran cukup 2 vCPU / 4 GB RAM. Untuk produk penuh nanti: 4 vCPU / 8 GB.
   Di hPanel Hostinger: VPS → OS → pilih *Ubuntu 24.04* (tanpa panel).
2. **Domain** dengan dua DNS *A record* yang mengarah ke IP VPS:
   - `domainanda.com` → IP VPS
   - `api.domainanda.com` → IP VPS

   Kalau VPS punya IPv6, tambahkan juga *AAAA record*. Tunggu sampai DNS aktif (cek: `dig +short domainanda.com`).
3. **Email** untuk sertifikat HTTPS (Let's Encrypt mengirim pemberitahuan ke sini).
4. **Akun SMTP** (opsional tapi sangat disarankan) untuk email konfirmasi daftar tunggu. Contoh: Resend, Postmark, Brevo, Amazon SES, atau email Hostinger.
5. **Akses ke repo GitHub** `fourtisf/blackbox`.

> Semua perintah di bawah dijalankan di terminal VPS. Ganti `domainanda.com` dan `email@anda.com` dengan milik Anda.

---

## 2. Masuk ke VPS dan buat user aplikasi

```bash
ssh root@IP_VPS
```

```bash
adduser --disabled-password --gecos "" blackbox
mkdir -p /var/www/blackbox && chown blackbox:blackbox /var/www/blackbox
apt-get update && apt-get install -y git
```

## 3. Hubungkan VPS ke GitHub (deploy key, hanya baca)

```bash
sudo -u blackbox -H bash -c 'ssh-keygen -t ed25519 -C blackbox-vps -f ~/.ssh/id_ed25519 -N "" && cat ~/.ssh/id_ed25519.pub'
```

Salin baris yang muncul (diawali `ssh-ed25519`), lalu di GitHub buka repo → **Settings → Deploy keys → Add deploy key**.
Tempel, beri nama `VPS`, **jangan** centang *Allow write access*, lalu simpan.

## 4. Ambil kode

```bash
sudo -u blackbox -H git clone --recursive git@github.com:fourtisf/blackbox.git /var/www/blackbox
```

Ketik `yes` saat ditanya tentang github.com. Kalau kode yang mau dipasang ada di branch lain, tambahkan `-b nama-branch`.

## 5. Jalankan setup (sekali saja)

```bash
cd /var/www/blackbox
sudo bash infra/setup-vps.sh --domain domainanda.com --api-domain api.domainanda.com --email email@anda.com --prelaunch
```

Skrip ini memasang Node.js, pnpm, PM2, Nginx, Certbot, PostgreSQL 16 dan Redis 7. Lalu ia membuat database dan file `.env` dengan
kata sandi acak, membangun website dan API, menjalankannya, memasang HTTPS dan firewall, serta backup database setiap malam.

Di akhir, skrip menampilkan **Admin token**. **Simpan di password manager.** Token yang sama juga ada di `/var/www/blackbox/.env`.

Skrip aman dijalankan ulang kalau ada langkah yang gagal (misalnya DNS belum aktif saat membuat sertifikat).

## 6. Periksa

- `https://domainanda.com`: website tampil dengan label *Demo*.
- `https://api.domainanda.com/v1/health`: menampilkan `"ok":true`.
- `https://domainanda.com/admin`: tempel admin token, lalu lihat daftar tunggu dan unduh CSV.
- Coba daftar dengan email Anda sendiri di bagian bawah beranda, lalu lihat apakah muncul di `/admin`.

## 7. Email konfirmasi (SMTP)

Tanpa SMTP, pendaftar tetap tersimpan, hanya tidak menerima email konfirmasi. Untuk menyalakannya:

```bash
sudo -u blackbox nano /var/www/blackbox/.env
```

Isi dua baris ini (contoh, sesuaikan dengan penyedia Anda):

```
SMTP_URL=smtps://USERNAME:PASSWORD@smtp.penyedia.com:465
MAIL_FROM=Blackbox <hello@domainanda.com>
```

Lalu muat ulang:

```bash
sudo -u blackbox -H bash /var/www/blackbox/infra/deploy.sh --prelaunch
```

Atur juga **SPF dan DKIM** di DNS sesuai petunjuk penyedia email, supaya email konfirmasi tidak masuk spam.

## 8. Isi konten Anda

Di `.env` (setelah diubah, jalankan `deploy.sh` lagi karena nilai `NEXT_PUBLIC_*` masuk saat build):

| Variabel | Untuk |
|---|---|
| `NEXT_PUBLIC_CONTACT_EMAIL` | Email kontak di halaman About |
| `NEXT_PUBLIC_SECURITY_CONTACT` | Kontak laporan keamanan (juga mengaktifkan `/.well-known/security.txt`) |
| `NEXT_PUBLIC_X_URL`, `NEXT_PUBLIC_TELEGRAM_URL`, `NEXT_PUBLIC_GITHUB_URL` | Link di footer dan About |
| `NEXT_PUBLIC_ANALYTICS` dan variabel Plausible/Umami | Statistik pengunjung tanpa cookie (lihat `.env.example`) |
| `NEXT_PUBLIC_API_DISPLAY_HOST` | Domain API di contoh kode beranda, misalnya `api.domainanda.com` |

Nama tim untuk halaman About ada di `apps/web/content/team.ts` (ubah di repo, push, lalu `deploy.sh`).

## 9. Update kode berikutnya

Setiap ada perubahan baru di GitHub:

```bash
sudo -u blackbox -H bash /var/www/blackbox/infra/deploy.sh --prelaunch
```

Website dan API dimuat ulang tanpa downtime.

## 10. Backup

- Otomatis setiap malam pukul 03:17 ke `/var/backups/blackbox`, disimpan 14 hari.
- **Salin juga ke luar server.** Isi `BACKUP_RSYNC_TARGET` (misalnya `user@server-backup:/backups/blackbox`) di crontab root.
- Mengembalikan backup:

```bash
gunzip -c /var/backups/blackbox/NAMA-FILE.sql.gz | sudo -u postgres psql blackbox
```

## 11. Kalau ada masalah

| Gejala | Cek |
|---|---|
| Sertifikat HTTPS gagal | DNS belum mengarah ke VPS: `dig +short domainanda.com`. Setelah benar, jalankan ulang langkah 5. |
| `502 Bad Gateway` | `sudo -u blackbox pm2 status` dan `sudo -u blackbox pm2 logs` |
| API mati dengan pesan `WAITLIST_SECRET` | Baris itu hilang dari `.env`; jalankan ulang langkah 5 (secret lama tetap dipakai kalau ada). |
| Form daftar tunggu error | `https://api.domainanda.com/v1/health`, lalu `pm2 logs bb-api` |

## 12. Keamanan

- `.env` berisi kata sandi dan token: jangan dibagikan, jangan di-commit.
- Masuk SSH dengan key, lalu matikan login password (`PasswordAuthentication no` di `/etc/ssh/sshd_config`).
- Nyalakan update keamanan otomatis: `apt-get install -y unattended-upgrades`.
- Firewall hanya membuka port 22, 80 dan 443. Kalau Hostinger punya firewall di panel, samakan aturannya.
