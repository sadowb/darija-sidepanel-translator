FROM php:8.3-apache

# Copy the PHP client files into Apache's public root
COPY index.php /var/www/html/
COPY public/ /var/www/html/public/
COPY src/ /var/www/html/src/

# Expose HTTP port
EXPOSE 80
