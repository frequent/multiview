				
				
				
				
				// TODO: panelHash last option should be regular hashChange call in case all panels are in basic setup
				// (I)
				if ( to ) {
					// same as JQM
					to = ( typeof to === "string" && !$.mobile.path.isPath( to ) ) ? ( $.mobile.path.makeUrlAbsolute( '#' + to, documentBase ) ) : to;

					//(1)
					// ie 4 stacks, height 2,2,2,4 > longest.length = 1/4 = 0,25 = panelHistory
					// ie 4 stacks, height 1,1,1,1 > longest.length = 4/4 = 1 = JQM
					if ( longest.length/n != 1 ) {
						// panel history transition
						
						console.log(longest.length+"  "+longest[0]+"  "+longest);
						
						// popovers always go first!
						// if ( $( $last0 ).closest(':jqmData(role="panel")') != "popover" || $( $last1 ).closest(':jqmData(role="panel")')  == "popover" )
						
						// (A)
						// [ok] single highest panel can only be a popover or fullwidth panel, 
						// as menu and main increase together > reduce it
						if (longest.length == 1 ) {						
							var gotoPage = longest[0][longestLen-2].toString();						
							}					
					
						// (B)
						// two highest panels
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
										// TODO: fullwidth/popover combo, 
										// should decrease popover until basic setup, then decrease fullwidth
										// DOESN'T WORK 4-4 > 4-3, then fullwidth will be reduced. 									
										// if ( $( $last0 ).closest(':jqmData(role="panel")') != "popover" || $( $last1 ).closest(':jqmData(role="panel")')  == "popover" )									
										}
							}
					
						// (C)
						// three or more highest stacks
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
						console.log("gotoPage="+gotoPage);
						// declare fromPage, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
						var fromPage = $( gotoPage ).closest(':jqmData(role="panel")').find('.ui-page-active'),
							changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true };
					
						$.mobile.changePage ( gotoPage, changePageOptions ); 					
								
						// cleanUp
						$('.stackTrigger').each(function() { 
							$(this).data('stack').pop(); 
							});				
						$('.stackTrigger').removeClass('stackTrigger');	
						
					// (2)
					} else {
						// all stacks at same height = basic setup = JQM should do this
						// console.log("Panels at base"+to+"  "+longestLen+"  "+longest.length);
						// $.mobile.changePage( to, changePageOptions );						
						}
					// (II)	
					} else {
						// regular JQM tranistion without to
						// console.log("JQM"+to+"  "+longestLen+"  "+longest.length);
						// $.mobile.changePage( $.mobile.firstPage, changePageOptions );
						} 