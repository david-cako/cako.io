var email = document.getElementById("email-address");
var u = "dc";
var d = "cako.io";
var a = u + "@" + d;
email.outerHTML = email.outerHTML.replace(/name@domain.io/g, a);
