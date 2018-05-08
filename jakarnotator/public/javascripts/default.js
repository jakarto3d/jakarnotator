(function() {
    // get current URL path and assign 'active' class
    let pathname = window.location.pathname;
    $('nav > .navbar-collapse > .navbar-nav > a[href="' + pathname + '"]').addClass('active');
})();
