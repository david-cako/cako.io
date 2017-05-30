---
title: "Easily add https to nginx on Ubuntu"
date: "2017-02-17 22:49:48"
---

# Easily add https to nginx on Ubuntu

<sup>2017-02-17 22:49:48</sup>

Let's Encrypt is a Linux Foundation supported project that offers free (gratis) SSL certificates, and supports an easy to use automated tool, "certbot", for installing them.

### Installing certbot

First, add the certbot repository to your machine:

```bash
$ sudo add-apt-repository ppa:certbot/certbot
```

Then, fetch the package index from the newly added repository:

```bash
$ sudo apt update
```

Finally, install certbot:

```bash
$ sudo apt install python-certbot-nginx
```

### Using certbot

Certbot is an incredibly easy to use and automated configuration utility that automatically sets up your `sites-enabled` conf file(s) to accept SSL requests.

Start the certbot utility with

```bash
$ sudo certbot --nginx
```

It will ask you for your email and some other information to associate you with the certificate.

Certbot will then look at your existing configuration files and ask you which domains you want to enable SSL/HTTPS for.  

Finally, certbot will ask you whether you want "HTTPS access should be required or optional".  

```bash
Please choose whether HTTPS access is required or optional.
--------------------------------------------------------------
1: Easy - Allow both HTTP and HTTPS access to these sites
2: Secure - Make all requests redirect to secure HTTPS access
--------------------------------------------------------------
```

Choosing option 2, "secure", means that if users input the regular http url (for instance, `http://cako.io`, or just `cako.io`), nginx will automatically redirect their request to https.  This is up to you, but unless you have specific reasons not to, this seems like the way to go.

Certbot should automatically restart nginx for you, if not:

```bash
$ sudo systemctl restart nginx
``` 

Try it out!  All requests should now be redirected to https, and you should see "secure" in your URL bar.
