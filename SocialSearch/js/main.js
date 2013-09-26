"use strict";


require.config({

	paths: {
		"jquery": "libs/jquery-1.10.2.min",
		"knockout": "libs/knockout-2.3.0",
		"isotope": "libs/jquery.isotope.min"
	}

});



require(["jquery", "social"], function($, demosSocial ){

	$(document).ready( function(){
		demosSocial.init(30, $("#thumb-wrapper"));
	});


});


