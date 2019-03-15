$(document).ready(function() {

    var person = function (first, last, age, eye) {
        this.firstName = first;
        this.lastName = last;
        this.age = age;
        this.eyeColor = eye;
    };

    var myFather = new person("John", "Doe", 50, "blue");
    var myMother = new person("Sally", "Rally", 48, "green");

});