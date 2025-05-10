# Windows tabanlı Docker imajını kullanıyoruz
FROM dockurr/windows:latest

# Çevresel değişkenler, kullanıcının belirttiği parametrelerle yapılandırılabilir
ENV VERSION=11
ENV USERNAME=MASTER
ENV PASSWORD=admin@123
ENV RAM_SIZE=16G
ENV CPU_CORES=8
ENV DISK_SIZE=500G
ENV DISK2_SIZE=100G

# noVNC'yi varsayılan olarak başlatan komut dosyasını çalıştırmak için
# Portları expose et
EXPOSE 8080
EXPOSE 3389

# noVNC'nin otomatik olarak başlatılması için komut
