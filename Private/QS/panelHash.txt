

// ------------  Panel-History Routine -------------------

// Currently my pageContainer-history routine is setup inside JQM RC2 _mobileHashChange (see below - 2.)
// I want to remove it from there and put it into the plugin's panelHash function (below 1.)

// PROBLEM: 
// I cannot call panelHash, either by binding to something or by calling it from 
// inside _handleHashChange

// DETAILS:
// JQM calls _handleHashChange on two occasions:
// (a) hashchange event handler
// (b) pushstate handle

// in my current setup I just hooked into _handleHashChange and did my rountine there.
// When I remove my rountine into a stand-alone function inside my plugin I need to
// find a way to fire this plugin-function alongside _handleHashChange

// I tried (a) binding to $window.bind( "hashchange", function( e, triggered ), but this 
// seems to fire on every pagechange if set inside my plugin, plus I cannot capture
// the pushState firing (b)

// Therefore I now want to fire panelHash from inside _mobileHashChange by checking for
// n>0 (panels on the page). If n>0 I call the panelHash function, if not , JQM continues
// as normal.
// I don't like this AND I can't get it to work.

// QUESTION: Is there a way to bind to "_handleHashChange being fired" (preferred) or how 
// can I call a public function in widget-factory plugin 1 from inside widget-factory plugin 2?

// THANKS FOR HELP! 
		
		

// 1. plugin panel hash function (nothing special):

		panelHash: function( hash ) {
				
				console.log("panelHash fired");
		
			// make function public
			$.mobile.multiview.panelHash = panelHash; 			
		},
		



		
// 2. modified JQM _handleHashChange (with comments... notes of changes @ XXX FREQUENT)

$.mobile._handleHashChange = function( hash ) {
						
						
			//find first page via hash					
			var to = path.stripHash( hash ),
				
				// XXX FREQUENT: panel-transition routine, activates if panels on the page with data-hash="history"			
				$panels = $('div:jqmData(hash="history")'),
				n = $panels.length,
				
				//transition is false if it's the first page, undefined otherwise (and may be overridden by default)	
				transition = ( $.mobile.urlHistory.stack.length === 0 || n == 0 ) ? "none" : undefined,

				// default options for the changPage calls made after examining the current state
				// of the page and the hash
				// XXX FREQUENT: added pageContainer as new option
				changePageOptions = {
					transition: transition,
					changeHash: false,
					fromHashChange: true,
					pageContainer: null,
					};

			//if listening is disabled (either globally or temporarily), or it's a dialog hash
			if( !$.mobile.hashListeningEnabled || urlHistory.ignoreNextHashChange ) {
				urlHistory.ignoreNextHashChange = false;
				return;
			}

			// special case for dialogs
			if( urlHistory.stack.length > 1 && to.indexOf( dialogHashKey ) > -1 ) {

				// If current active page is not a dialog skip the dialog and continue
				// in the same direction
				if(!$.mobile.activePage.is( ".ui-dialog" )) {
					//determine if we're heading forward or backward and continue accordingly past
					//the current dialog
					urlHistory.directHashChange({
						currentUrl: to,
						isBack: function() { window.history.back(); },
						isForward: function() { window.history.forward(); }
					});

					// prevent changePage()
					return;
				} else {
					// if the current active page is a dialog and we're navigating
					// to a dialog use the dialog objected saved in the stack
					urlHistory.directHashChange({
						currentUrl: to,

						// regardless of the direction of the history change
						// do the following
						either: function( isBack ) {
							var active = $.mobile.urlHistory.getActive();

							to = active.pageUrl;

							// make sure to set the role, transition and reversal
							// as most of this is lost by the domCache cleaning
							$.extend( changePageOptions, {
								role: active.role,
								transition:	 active.transition,
								reverse: isBack
							});
						}
					});
				}
			}
			
			// XXX FREQUENT 
			// ------------  RELOCATE TO PLUGIN -------------------
			// create combined array of highest panel-history stacks 
			// (if 3 stacks with 2 entries each, the combo-array
			// longest[] will contain 3 arrays [array1, array2, array3]
			// and each array will contain two entries
			//
			// entries are made by stackUp() function in multiview plugin
			// TODO: recheck
			
				var longest = [],
					longestLen = 0;
		
				$panels.each(function(){					
					var data = $(this).data("stack");										
					if(data.length > longestLen){					
						longest = [data];
						longestLen = data.length;							
						}
						else if(data.length == longestLen) {
							longest.push(data);																					
							}
					});							
				
				// prepare cleanup, add stackTrigger class
				$panels.each(function() {
					if ( $(this).data("stack").length == longestLen ) {
						$(this).addClass("stackTrigger");
						}
					});
					
			// ------------  END -------------------		
					
			//if to is defined, load it
			if ( to ) {
				// At this point, 'to' can be one of 3 things, a cached page element from
				// a history stack entry, an id, or site-relative/absolute URL. If 'to' is
				// an id, we need to resolve it against the documentBase, not the location.href,
				// since the hashchange could've been the result of a forward/backward navigation
				// that crosses from an external page/dialog to an internal page/dialog.
				to = ( typeof to === "string" && !path.isPath( to ) ) ? ( path.makeUrlAbsolute( '#' + to, documentBase ) ) : to;
				
				// XXX - FREQUENT - panel history-stack routine
				// ------------  REMOVE INTO PLUGIN -------------------
				// TODO: check for n>0 here, if yes, preventdefault() and reroute to plugin panelHash
				// TODO: panelHash last option should be regular hashChange call in case all panels are in basic setup

				// only override JQM-history if panels are used and [removed for now] all panels are not in basic setup (all panels at stack height = 1)
				if ( n>0 ) {											
				// if ( n>0 && longest.length/n != 1 ) {
				
					// [ok] single highest panel can only be a popover or fullwidth panel, as menu and main increase together
					if (longest.length == 1 ) {						
						var gotoPage = longest[0][longestLen-2].toString();																	
						}					
					
					if (longest.length == 2 ) {							
						var $last0 = longest[0][longestLen-1].toString(),
							$last1 = longest[1][longestLen-1].toString();								
												
						//[ok] main/menu (increase simultaneously - passive entry = "yield")
						// backwards transition should be made to last entry not being yield
						// starting from stackHeight-1 (otherwise result will be currently 
						// active page
						if ( $last0 == "yield" )  { 
							for (i = longestLen-2; i>=0; i--) {				
								if ( longest[1][i].toString() != "yield") {									
									var gotoPage = longest[1][i].toString();									
									break;
									}
								}
							} else if ($last1 == "yield" ) {								
								for (i = longestLen-2; i>=0; i--) {
									if ( longest[0][i].toString() != "yield") {										
										var gotoPage = longest[0][i].toString();																			
										break;
										}
									}				
								} else  { 
									// TODO: fullwidth/popover (popover always goes first until in basic mode)
									// if ( $( $last0 ).closest(':jqmData(role="panel")') != "popover" || $( $last1 ).closest(':jqmData(role="panel")')  == "popover" )									
									}
	
						}
									
					if (longest.length >= 3) {	
						// 3 panels with same stack height, should always be a popover (with main/menu at same stack-height = popover goes first
						// TODO: doesn't work if menu/main stack height > popover stack height... 
						// TODO: change logic so that popover always goes first until it's back to setup-level, then change back on main/menu
						var $last = [];
						for ( var i = 0; i < longest.length; i++) {							
						  $last.push( longest[i][ longest[i].length - 1 ] );						  						  
						  if ( $( $last[i] ).closest(':jqmData(role="panel")').jqmData('panel')  == "popover" ) { 
								var gotoPage = $last[i];
								}						  
						}						
					  }					
					
					// declare fromPage, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
					var fromPage = $( gotoPage ).closest(':jqmData(role="panel")').find('.ui-page-active'),
						changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true };
					
					$.mobile.changePage ( gotoPage, changePageOptions ); 					
					
					// cleanUp
					$('.stackTrigger').each(function() { 
						$(this).data('stack').pop(); 
					});				
					$('.stackTrigger').removeClass('stackTrigger');														
					
					} else {
						// TODO: not working 						
						$.mobile.changePage( to, changePageOptions );
						}
				// ------------  END -------------------
			}	else {
				//there's no hash, go to the first page in the dom
				$.mobile.changePage( $.mobile.firstPage, changePageOptions );
			}
		};		