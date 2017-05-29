---
title: "Using git send-email with MXroute"
date: "2017-02-17 23:21:53"
---

MXroute does not seem to play nice with a lot of the command line utilities that I have tried using with it!  The best solution that I have found is using Google's mail servers to send mail using a separate identity.

If you attempt to send email through Google's servers using a different "From" address than the one you are authenticating with, Google will override it.  This behavior can be changed by adding your MXroute address to Gmail as a new send-as address.

From the classic Gmail interface (not Inbox), click the gear on the top right and open "Settings".  Navigate to "Accounts and Import", and add your MXroute address using MXroute's login information.

You will need to create an app-specific password for your Gmail account.  This will give you a password to use in your `.gitconfig` that isn't your actual password, and circumvents 2-factor authentication if you have it enabled.

Go to your [Google Account settings](https://myaccount.google.com/), click "Sign in and security", and create a new app password.  

Now, open your `~/.gitconfig` file and add the following fields:

```html
[sendemail]
    smtpEncryption = tls
    smtpServer = smtp.gmail.com
    smtpUser = <YOUR_GMAIL_ADDRESS>
    smtpPass = <YOUR_APP_PASSWORD>
    smtpServerPort = 587
```

git will automatically use your name and email configuration saved globally or per-repository.  Alternatively, you can add the following to the `[sendemail]` section to force a specific `From:` header:

```html
    from = <Your Name> name@domain.com
```

Test out a git send-email!  You should now be sending patches using your provided identity.