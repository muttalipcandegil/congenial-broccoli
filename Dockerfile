FROM dorowu/ubuntu-desktop-lxde-vnc:focal-lxqt

CMD bash -c '\
  /usr/bin/supervisord -c /etc/supervisor/supervisord.conf & \
  sleep 10 && \
  while true; do \
    curl -A "Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36" -s http://localhost:80 > /dev/null; \
    sleep 30; \
  done'
