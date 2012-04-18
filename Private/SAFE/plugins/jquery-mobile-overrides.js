(function($,window,undefined) {
	
	//$( document ).bind ('click tap scrollstart scrollstop scroll focus blur', function (event) {
	//	console.log ("event ="+event.type);
	//});
	
	$( window.document ).bind('mobileinit', function(){

		//override _registerInternalEvents to bind to new methods below
			  $.mobile._registerInternalEvents = function(){
			  
			  alert ("first");
				//DONE: bind hashchange with this plugin
				//hashchanges are defined only for the main panel - other panels should not support hashchanges to avoid ambiguity
				$.mobile._handleHashChange = function( hash ) {
					var to = $.mobile.path.stripHash( hash ),
						transition = $.mobile.urlHistory.stack.length === 0 ? "none" : undefined,
						$mainPanel=$('div:jqmData(id="main")'),
						$mainPanelFirstPage=$mainPanel.children('div:jqmData(role="page"):first'),
						$mainPanelActivePage=$mainPanel.children('div.ui-page-active'),
						$menuPanel=$('div:jqmData(id="menu")'),
						$menuPanelFirstPage=$menuPanel.children('div:jqmData(role="page"):first'),
						$menuPanelActivePage=$menuPanel.children('div.ui-page-active'),
						dialogHashKey = "&ui-state=dialog",
					
					// default options for the changPage calls made after examining the current state
					// of the page and the hash
					
					changePageOptions = {
						transition: transition,
						changeHash: false,
						fromHashChange: true,
						pageContainer: $mainPanel
						};
						
					  
				  if( !$.mobile.hashListeningEnabled || $.mobile.urlHistory.ignoreNextHashChange ){		    
					$.mobile.urlHistory.ignoreNextHashChange = false;
					return;
				  }		  		  
				  
				  // special case for dialogs		  		  		  
				  if( $.mobile.urlHistory.stack.length > 1 && to.indexOf( dialogHashKey ) > -1 ) {					
					// If current active page is not a dialog skip the dialog and continue
					// in the same direction
					if(!$.mobile.activePage.is( ".ui-dialog" )) {						
					  //determine if we're heading forward or backward and continue accordingly past
					  //the current dialog			  			
					  $.mobile.urlHistory.directHashChange({
						currentUrl: to,
						isBack: function() { window.history.back(); },
						isForward: function() { window.history.forward(); }
					  });
					  // prevent changepage
					  return;
					} else {						
					  // var setTo = function() { to = $.mobile.urlHistory.getActive().pageUrl; };
					  // if the current active page is a dialog and we're navigating
					  // to a dialog use the dialog objected saved in the stack
					  // urlHistory.directHashChange({ currentUrl: to, isBack: setTo, isForward: setTo });
					  // urlHistory.directHashChange({ currentUrl: to, isBack: setTo, isForward: setTo });
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
									transition:  active.transition,
									reverse: isBack
									});
								}
							});
					}
				  } else if ( to == dialogHashKey ) { 						
					// FREQUENT photoswipe dialog, fires without .ui-dialig or rel="dialog"			
					e.preventDefault();									
					} 

				  //if to is defined, load it
				  if ( to ){		 				  
					to = ( typeof to === "string" && !$.mobile.path.isPath( to ) ) ? ( $.mobile.path.makeUrlAbsolute( '#' + to, documentBase ) ) : to;
					//if this is initial deep-linked page setup, then changePage sidemenu as well
					if (!$('div.ui-page-active').length) {
						$menuPanelFirstPage='#'+$menuPanelFirstPage.attr('id');
						$.mobile.changePage($menuPanelFirstPage, {transition:'none', reverse:true, changeHash:false, fromHashChange:false, pageContainer:$menuPanel});
						$.mobile.activePage=undefined;
						}
					$.mobile.activePage=$mainPanelActivePage.length ? $mainPanelActivePage : undefined;          
					$.mobile.changePage(to, changePageOptions );
					} else {
					//there's no hash, go to the first page in the main panel.          	
					$.mobile.activePage=$mainPanelActivePage? $mainPanelActivePage : undefined;
					$.mobile.changePage( $mainPanelFirstPage, changePageOptions ); 
				  }
				}
				
				//hashchange event handler
				$(window).bind( "hashchange", function( e, triggered ) {
					$.mobile._handleHashChange( location.hash );
					});
				
				//DONE: link click event binding for changePage
				//click routing - direct to HTTP or Ajax, accordingly
				$(document).bind( "click", function(event) {
						
					var link = findClosestLink(event.target);
						if (!link) {
							return;
							}								
						
						var $link = $(link),				
						httpCleanup = function(){
							window.setTimeout( function() { removeActiveLinkClass( true ); }, 200 );
							};					  				
										
						// check for splitview in link or destination page
						if ( $link.jqmData('splitview') == true || $( $link.attr("href") ).jqmData('splitview') == true ) {							
							splitScreen ( "click" );
							checkWidth ();				
							} else {											
								// splitview should close if 1) destination is in main panel AND 2) menu panel is not active
								if ($link.closest('div:jqmData(id="menu")').length == 0 && $($link.attr('href')).closest('div:jqmData(panel)').jqmData('panel') == "main") {								
								
									// no-close on clicking collapsibles								
									if ($link.hasClass('ui-collapsible-heading-toggle')) {									
										return;
										}
										
									// clear all splitview formatting						
									$('div:jqmData(panel="main")').removeClass( 'ui-panel-left ui-panel-right ui-border-right');								
									$('div:jqmData(id="menu")').addClass('menuHide').removeClass('ui-panel-active');																														
									$('html').removeClass('ui-splitview-active ui-splitview-mode ui-popover-mode switchable');
											
									// clear menu buttons from popover mode								
									replaceBackBtn();
											
									// clear checkWidth 								
									$('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")').css({'margin-left':'', 'width':'auto', 'right':'0'});
																											
									} else {										
										
										// IMPROVE - block href="#" to keep splitview intact if popovers are opened
										if ($link.attr('href') == '#') {									
											event.preventDefault();
											return;
											}								
										}
									}

						  //if there's a data-rel=back attr, go back in history
						  if( $link.is( ":jqmData(rel='back')" ) ) {										
							window.history.back();
							return false;
						  }

						  //if ajax is disabled, exit early
						  if( !$.mobile.ajaxEnabled ){						
							httpCleanup();
							//use default click handling
							return;
						  }

						  var baseUrl = getClosestBaseUrl( $link ),
									 
						  //get href, if defined, otherwise fall to null #
						  href = $.mobile.path.makeUrlAbsolute( $link.attr( "href" ) || "#", baseUrl );

						  
						  // XXX_jblas: Ideally links to application pages should be specified as
						  // an url to the application document with a hash that is either
						  // the site relative path or id to the page. But some of the
						  // internal code that dynamically generates sub-pages for nested
						  // lists and select dialogs, just write a hash in the link they
						  // create. This means the actual URL path is based on whatever
						  // the current value of the base tag is at the time this code
						  // is called. For now we are just assuming that any url with a
						  // hash in it is an application page reference.
						  if ( href.search( "#" ) != -1 ) {
							href = href.replace( /[^#]*#/, "" );
							if ( !href ) {
							  //link was an empty hash meant purely
							  //for interaction, so we ignore it.
							  event.preventDefault();
							  return;
							} else if ( $.mobile.path.isPath( href ) ) {
							  //we have apath so make it the href we want to load.
							  href = $.mobile.path.makeUrlAbsolute( href, baseUrl );
							} else {
							  //we have a simple id so use the documentUrl as its base.
							  href = $.mobile.path.makeUrlAbsolute( "#" + href, documentUrl.hrefNoHash );
							}
						  }
					  
						  // Should we handle this link, or let the browser deal with it?
						  var useDefaultUrlHandling = $link.is( "[rel='external']" ) || $link.is( ":jqmData(ajax='false')" ) || $link.is( "[target]" ),
				  
							  // Some embedded browsers, like the web view in Phone Gap, allow cross-domain XHR
							  // requests if the document doing the request was loaded via the file:// protocol.
							  // This is usually to allow the application to "phone home" and fetch app specific
							  // data. We normally let the browser handle external/cross-domain urls, but if the
							  // allowCrossDomainPages option is true, we will allow cross-domain http/https
							  // requests to go through our page loading logic.
							  isCrossDomainPageLoad = ( $.mobile.allowCrossDomainPages && documentUrl.protocol === "file:" && href.search( /^https?:/ ) != -1 ),

							  //check for protocol or rel and its not an embedded page
							  //TODO overlap in logic from isExternal, rel=external check should be
							  // moved into more comprehensive isExternalLink
							  isExternal = useDefaultUrlHandling || ( $.mobile.path.isExternal( href ) && !isCrossDomainPageLoad ),

							  isRefresh=$link.jqmData('refresh'),
							  $targetPanel=$link.jqmData('panel'),
							  $targetContainer=$('div:jqmData(id="'+$targetPanel+'")'),
							  $targetPanelActivePage=$targetContainer.children('div.'+$.mobile.activePageClass),
							  $currPanel=$link.parents('div:jqmData(role="panel")'),
							  //not sure we need this. if you want the container of the element that triggered this event, $currPanel
							  $currContainer=$.mobile.pageContainer,
							  $currPanelActivePage=$currPanel.children('div.'+$.mobile.activePageClass),
							  url=$.mobile.path.stripHash($link.attr("href")),
							  from = null;
										
							  
						  //still need this hack apparently:
						  $('.ui-btn.'+$.mobile.activeBtnClass).removeClass($.mobile.activeBtnClass);
						  $activeClickedLink = $link.closest( ".ui-btn" ).addClass($.mobile.activeBtnClass);

						  if( isExternal ) {
							// block photoSwipe
							if ( $link.hasClass("swipeMe") == true ) {
								return;
								} else {
									httpCleanup();
									//use default click handling
									return;
									}
							}				  				 

						  //use ajax
						  var transitionVal = $link.jqmData( "transition" ),
							  direction = $link.jqmData("direction"),
							  reverseVal = (direction && direction === "reverse") ||
										// deprecated - remove by 1.0
										$link.jqmData( "back" ),
							  //this may need to be more specific as we use data-rel more
							  role = $link.attr( "data-" + $.mobile.ns + "rel" ) || undefined,
							  hash = $currPanel.jqmData('hash');
								
						//if link refers to an already active panel, stop default action and return
						if ($targetPanelActivePage.attr('data-url') == url || $currPanelActivePage.attr('data-url') == url) {					
							if (isRefresh) { //then changePage below because it's a pageRefresh request											
								$.mobile.changePage(href, {fromPage:from, transition:'fade', reverse:reverseVal, changeHash:false, pageContainer:$targetContainer, reloadPage:isRefresh});
								} else { //else preventDefault and return							
									event.preventDefault();
									return;
									}
							}
							//if link refers to a page on another panel, changePage on that panel
							else if ($targetPanel && $targetPanel!=$link.parents('div:jqmData(role="panel")')) {												
								var from=$targetPanelActivePage;						
								$.mobile.pageContainer=$targetContainer;
								$.mobile.changePage(href, {fromPage:from, transition:transitionVal, reverse:reverseVal, pageContainer:$targetContainer});
								}
							//if link refers to a page inside the same panel, changePage on that panel
							else {											
								var from=$currPanelActivePage;						
								$.mobile.pageContainer=$currPanel;
								var hashChange= (hash == 'false' || hash == 'crumbs')? false : true;
								$.mobile.changePage(href, {fromPage:from, transition:transitionVal, reverse:reverseVal, changeHash:hashChange, pageContainer:$currPanel});			
								//active page must always point to the active page in main - for history purposes.
								$.mobile.activePage=$('div:jqmData(id="main") > div.'+$.mobile.activePageClass);
								}										
							event.preventDefault();
						});
				
				//prefetch pages when anchors with data-prefetch are encountered
				$( ".ui-page" ).live( "pageshow.prefetch", function(){
				  var urls = [],
				  $thisPageContainer = $(this).parents('div:jqmData(role="panel")');
				  $( this ).find( "a:jqmData(prefetch)" ).each(function(){
					var url = $( this ).attr( "href" ),
						panel = $(this).jqmData('panel'),
						container = panel.length? $('div:jqmData(id="'+panel+'")') : $thisPageContainer;
					if ( url && $.inArray( url, urls ) === -1 ) {
					  urls.push( url );
					  $.mobile.loadPage( url, {pageContainer: container} );
					}
				  });
				} );
				
				//DONE: bind form submit with this plugin
					// $("form").die('submit');
					$("form").live('submit', function(event){
						var $this = $( this );
						if( !$.mobile.ajaxEnabled || $this.is( ":jqmData(ajax='false')" ) ){ return; }

						var type = $this.attr("method"),
							target = $this.attr("target"),
							url = $this.attr( "action" ),
							$currPanel=$this.parents('div:jqmData(role="panel")'),
							$currPanelActivePage=$currPanel.children('div.'+$.mobile.activePageClass);

						// If no action is specified, browsers default to using the
						// URL of the document containing the form. Since we dynamically
						// pull in pages from external documents, the form should submit
						// to the URL for the source document of the page containing
						// the form.
						if ( !url ) {
							// Get the @data-url for the page containing the form.
							url = getClosestBaseUrl( $this );
							if ( url === documentBase.hrefNoHash ) {
								// The url we got back matches the document base,
								// which means the page must be an internal/embedded page,
								// so default to using the actual document url as a browser
								// would.
								url = documentUrl.hrefNoSearch;
								}
							}

						url = $.mobile.path.makeUrlAbsolute( url, getClosestBaseUrl($this) );

						//external submits use regular HTTP
						if( $.mobile.path.isExternal( url ) || target ) {
							return;
							}

						//temporarily put this here- eventually shud just set it immediately instead of an interim var.
						$.mobile.activePage=$currPanelActivePage;
						// $.mobile.pageContainer=$currPanel;
						$.mobile.changePage(
							url, {
								type: type && type.length && type.toLowerCase() || "get",
								data: $this.serialize(),
								transition: $this.jqmData("transition"),
								direction: $this.jqmData("direction"),
								reloadPage: true,
								pageContainer:$currPanel
								});
						event.preventDefault();
					});

					//add active state on vclick
					$( document ).bind( "vclick", function( event ) {
						var link = findClosestLink( event.target );
							if ( link ) {
								if ( $.mobile.path.parseUrl( link.getAttribute( "href" ) || "#" ).hash !== "#" ) {
									$( link ).closest( ".ui-btn" ).not( ".ui-disabled" ).addClass( $.mobile.activeBtnClass );
									$( "." + $.mobile.activePageClass + " .ui-btn" ).not( link ).blur();
									}
								}
						});
			  			
				
				
				} //end _registerInternalEvents 
				
				function newResetActivePageHeight(){
									
					$page=$( ":jqmData(role='page')" ),
					$height = getScreenHeight();
					
					$page.each(function() {				
						var $panelType = $(this).closest('div:jqmData(role="panel")').jqmData('panel');		
						// override page height on popovers = menu/popovers in popover-mode and popovers only in splitview mode
						if ( $panelType == 'popover' || $panelType == 'menu' && $('html').hasClass('ui-popover-mode')  == true ) {						
							$(this).css("min-height", "inherit !important");  		
							} else {						
								$(this).css("min-height", $height );
								}
						});          

					// simply set the active page's minimum height to screen height, depending on orientation
					function getScreenHeight(){			
						var orientation = jQuery.event.special.orientationchange.orientation(),
							port = orientation === "portrait",
							winMin = port ? 480 : 320,
							screenHeight = port ? screen.availHeight : screen.availWidth,
							winHeight = Math.max( winMin, $( window ).height() ),
							pageMin = Math.min( screenHeight, winHeight );				
						return pageMin;
						}
					
			
				}
				
  });
})(jQuery,window);			