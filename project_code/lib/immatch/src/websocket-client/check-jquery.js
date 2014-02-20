// Check for jQuery library
if (typeof(jQuery) == "undefined") {
    alert("Cannot find jQuery library. " +
        "Please include jQuery before using imMatch library.");

    if (window.stop)
        window.stop();
}
