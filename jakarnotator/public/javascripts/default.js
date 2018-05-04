$(document).ready(function () {
    // get current URL path and assign 'active' class
    var pathname = window.location.pathname;
    $('nav > .navbar-collapse > .navbar-nav > a[href="' + pathname + '"]').addClass('active');
})