define(["jquery", "knockout", "isotope"], function($, ko, isotope){

	"use strict";


	var demos = {} || demos;

	demos.Social = new function(){


		//INDIVIDUAL SOCIAL POST
		function SocialPost(url, width, height, link, network, number){
			this.url = ko.observable(url);
			this.width = ko.observable(width);
			this.height = ko.observable(height);
			this.link = ko.observable(link);
			this.network = ko.observable(network);
			this.number = ko.observable(number);

		}


		//INDIVIDUAL FLIP CARD
		function FlipCard(faceA, faceB){
			this.faceA = ko.observable(faceA);
			this.faceB = ko.observable(faceB);
			this.flipState = ko.observable("");
			this.visible = this.faceA;
			this.hidden = this.faceB;

			this.update = function( newPost ){

				this.hidden( newPost );
				
				//swap
				var temp = this.visible; 
				this.visible = this.hidden;
				this.hidden = temp;
			}
		}


		//VIEWMODEL STRUCTURE
		var socialViewModel = new function(){

			this.searchterm = ko.observable("startrek");
			this.message = ko.observable();
			this.cards = ko.observableArray();
			this.postsBuffer = [];
			this.positionList = [];
			this.postsInBuffer = false;
			this.maxPosts;
			this.$wrapper;

			this.instagramMaxID = "";
			this.tumblrTimestamp = "";
			this.nextTwitterURL ="";


			//socialViewModel.init()
			this.init = function(maxPosts, $wrapper){

				socialViewModel.maxPosts = maxPosts || 30;

				if ($wrapper)
					socialViewModel.$wrapper = $wrapper;
				else{
					console.log("error: no thumb-wrapper specified");
					return;
				}

				//Insert blank cards
				for (var i=0; i < socialViewModel.maxPosts; i++){
					socialViewModel.cards.push( new FlipCard( new SocialPost("", "FRONT", "blank", i), new SocialPost("", "BACK", "blank", i) ) );
				}

				$wrapper.on("postsInBuffer", function(){
					socialViewModel.updatePosts();
				});


				$wrapper.find(".inner img").load(function(){
					$(this).parents(".inner").toggleClass("flipped");
				});
			}


			function randomisePositions(){

				//Array for marking each number as 'used'
				var freshNumber = new Array(socialViewModel.maxPosts);
				
				var i = 0;
				while(i < socialViewModel.maxPosts){
					freshNumber[i]=true;
					i++;
				}

				//Generate the randomised number list
				var newNum;
				for(i=0; i < socialViewModel.maxPosts; i++){

					//Get random position
					newNum = Math.floor( Math.random()*socialViewModel.maxPosts );

					//Walk the list until it finds the first fresh number
					while( freshNumber[newNum] == false ){
						newNum = (newNum+1)%socialViewModel.maxPosts;
					}

					//Set the new random number
					socialViewModel.positionList.push(newNum);
					freshNumber[newNum] = false;
				}
				
			}

			this.doSearch = function(){
				randomisePositions();	
				searchInstagram( this.searchterm() );				
				searchTumblr( this.searchterm() );
				//searchTwitter( this.searchterm() );
			};

			function searchInstagram(value){

				//First search
				if (socialViewModel.instagramMaxID == ""){

					$.getJSON("https://api.instagram.com/v1/tags/" + value + "/media/recent?client_id=53942d38fce748c89771510ff0e3279a&callback=?", processInstagram);
				}

				//No more results from last search term
				else if (socialViewModel.instagramMaxID == "NO_MORE"){
					return;
				}

				else{
					$.getJSON("https://api.instagram.com/v1/tags/" + value + "/media/recent?client_id=53942d38fce748c89771510ff0e3279a&max_id="
						+ socialViewModel.instagramMaxID + "&callback=?", processInstagram);				
				}

			}


			//INSERT SOCIAL POSTS INTO socialViewModel
			function processInstagram(data, status, jqXHR){

				if (status == "success" && data.data != undefined){

					var postObject;
					console.log(data.data.length, " posts received from Instagram");
					$.each(data.data, function(index, element){
						
						//Insert new posts into buffer
						postObject = new SocialPost(
												element.images.standard_resolution.url,
												element.images.standard_resolution.width,
												element.images.standard_resolution.height,
												element.link, 
												'instagram'
												);
						addPost(postObject);
					});

					if (data.pagination.next_max_id){
						socialViewModel.instagramMaxID = data.pagination.next_max_id;
					}
					else {
						socialViewModel.instagramMaxID = "NO_MORE";
					}
						
					console.log("instagram next max id: ", socialViewModel.instagramMaxID);
				}
						
				else{
					socialViewModel.message("Something went wrong with the Instagram search. Please another search term.");
				}
			}


			function searchTumblr(value){
				
				if( socialViewModel.tumblrTimestamp == ""){
					$.getJSON("http://api.tumblr.com/v2/tagged?tag=" + value + "&api_key=M5WUUilR5UrPAuaiAj9RlfeyPMDgbhB0Gxk3buxUoManc5PyQf&callback=?", processTumblr);
				}
				else if (socialViewModel.tumblrTimestamp == "NO_MORE"){
					return;
				}

				else{
					$.getJSON("http://api.tumblr.com/v2/tagged?tag=" + value + "&before=" + socialViewModel.tumblrTimestamp +"&api_key=M5WUUilR5UrPAuaiAj9RlfeyPMDgbhB0Gxk3buxUoManc5PyQf&callback=?", processTumblr);	
				}
			}


			function processTumblr(data, status, jqXHR){

				if (status == "success" && data.response != undefined){

					var postObject;
					console.log(data.response.length, " posts received from Tumblr");

					$.each(data.response, function(index, element){
						
						if(element.photos){
							//Insert new posts into buffer
							postObject = new SocialPost(
														element.photos[0].alt_sizes[2].url,
														element.photos[0].alt_sizes[2].width,
														element.photos[0].alt_sizes[2].height,
														element.post_url, 
														'tumblr');
							addPost(postObject);
						}
					});

					if(data.response.length > 0){
						socialViewModel.tumblrTimestamp = data.response[ data.response.length - 1].timestamp;
						console.log('timestamp', socialViewModel.tumblrTimestamp);
					}
					else{
						socialViewModel.tumblrTimestamp = "NO_MORE";
					}
				}

				else{
					socialViewModel.message("Something went wrong with the Tumblr search. Please another search term.");
				}
			}				


			function searchTwitter(value){

			  	$.ajax({
			            type:"POST",
			            dataType: "json",
			            beforeSend: function(jqXHR){
			            	jqXHR.setRequestHeader("Authorization", "Bearer AAAAAAAAAAAAAAAAAAAAAPCYTAAAAAAAVHjRuZbnw9tDaSKgaCeh3y98wl4%3DkSNW6B2bC6xaGQfWNQwl1etKdfw8vXa7ZkVF5d7tj14")
			            },
			            headers: {
			            	"Authorization" : "Bearer AAAAAAAAAAAAAAAAAAAAAPCYTAAAAAAAVHjRuZbnw9tDaSKgaCeh3y98wl4%3DkSNW6B2bC6xaGQfWNQwl1etKdfw8vXa7ZkVF5d7tj14"
			            },
			            url: "https://api.twitter.com/1.1/search/tweets.json?q=" + value +"&callback=?",
			            success: processTwitter
			    })
			    .fail(function(){
			    	console.log('tiwtter failed');
			    })

			}


			function processTwitter(data, status){
				console.log('process twitter');
			}

			this.doPopular = function(){
				//$.getJSON("https://api.instagram.com/v1/media/popular?client_id=53942d38fce748c89771510ff0e3279a&callback=?", processPostsWrapper('instagram'));
			}

			this.thumbAdded = function(el){
				socialViewModel.$wrapper.isotope('insert', $(el));
			}

			function addPost(postObject){

				//Insert post into buffer
				socialViewModel.postsBuffer.push( postObject );

				//Trigger buffer show handler
				if( socialViewModel.postsInBuffer == false ){
					socialViewModel.postsInBuffer = true;
					socialViewModel.$wrapper.trigger("postsInBuffer");
				}
			}




			this.updatePosts = function(){

				//Trigger more ajax post gets if buffer is empty
				if(socialViewModel.postsBuffer.length < 1){
					socialViewModel.postsInBuffer = false;

					console.log('no posts left in postsBuffer');
					
					searchInstagram( socialViewModel.searchterm() );				
					searchTumblr( socialViewModel.searchterm() );

					return;
				}

				//Get random post off buffer
				var random = Math.floor( Math.random()*socialViewModel.postsBuffer.length );
				var newPost = socialViewModel.postsBuffer.splice(random, 1)[0];
					
				//Find position for it
				var newPos;
				var waitTime = 500;
				if ( socialViewModel.positionList.length > 0 ){
					newPos =  socialViewModel.positionList.pop();
				}
				else{
					newPos = Math.floor( Math.random()*socialViewModel.maxPosts );

					//Longer delay once intial set of images are up
					waitTime = 3000;
				}
				

				//Update screen post
				var screenFlipcard = socialViewModel.cards()[newPos];
				screenFlipcard.update( newPost );

				//Setup next post show
				setTimeout(socialViewModel.updatePosts, waitTime);

				//console.log( socialViewModel.postsBuffer.length + " posts left in buffer.")
			}	


		}
		//end socialViewModel


		//demos.Social.init
		this.init = function(maxPosts, $wrapper){

			ko.applyBindings( socialViewModel );	

			$wrapper.isotope({
				itemSelector: ".flipcard",
				layoutMode: "masonry"
			});

			socialViewModel.init(maxPosts, $wrapper);
		};
	}

	return demos.Social;
});

