/*
* jquery.mobile.multiview v1
* Copyright (c) 2011, Sven Franck, www.franckreich.de
* Dual licensed under the MIT and GPL Version 2 licenses.
* 
* Date: _ - Version: _
*
* made using: 
* splitview plugin by CS - http://asyraf9.github.com/jquery-mobile/
* iPad popover by Cagintranet - http://www.cagintranet.com/archive/create-an-ipad-like-dropdown-popover/
*/

// TODOS:		
		// ==== LATER ====	
		// remove scrollTops if no ui-fixed-element-bottom is used, maybe only use top and push down only
		// non JS-version and or light version?
		
		// ==== MISC ==== 				
		// make sure prefetching, form submit							
		// make menu-width optionable for every wrapper page
		// make a sitemap object, which users can attach to a panel or dom to make sure also external pages can be deeplinked				
		// make plugin callable on every wrapper page separately vs. handling all through one plugin? Otherwise how can options be varied across pages
		// mesh deeplinks with context loading
		
		// ==== FOOTER PRIO ====		
		// footer is jumping up on non-multiview pages, if they are starting pages. If starting on multiview, they are sitting tight.		
		// redo demo to include page with fixed-top and fixed-bottom element	
		// footer not hiding on scrollstart					
		// ui-element-fixed-bottom/top should not SHOW! automatically! HIDE effect is also... re-positioning not toggling, re-do		
		// footer positioning does not update when opening a collapsible
		// find out why footer blinks = repositions on changePage and overwrite if its a panel transition, this event also stalls scrollview
		// in IE fullscreen footer is stuck at panel-bottom (initial correct), position does not update with scrolling though (no fallback? or no update), happens because footer position is based on wrapper page rather than content?	
		// make sure footer positioning is not thrown off because of custom selectmenus, which are added inside wrapper... and have a height
		// add cushion when hiding footer on top, because if the footer > 40px its bottom edge is visible on HIDE on the top of the screen
		// footer on smaller pages blinks up once on load, then it is correctly positioned
						
		// ==== FOUND ERRORS ====
		// history.replaceState is not a function on iPad if loading a new page into a panel 		
		// scrollview stalls sometimes, not because of footer repositioning, but event that also repositions footer		
		// is there a transition queue to block new transitions firing before current transition is done, causes Jquery timeout error
		// deeplink panel does not show sometimes, if hideAllPanels on orientationchange, it show-hides (currently commented out)	
		// crumbs does not work if buttons contain more than plain links, this fails:  sub/legal.html
		// crumbify stops working after 3rd external page is loaded
		// deeplinks for external pages won't work. No info on where these pages belong, so cannot deeplink into a panel
		// site breaks if multipage pulled in as external page, shouldn't happen, because works in demo, too. 
		// dialogs don't work on ipad, on desktop at least they show up... pfff
		// main blinks on transitions on MAC, try pos:rel		
		// make sure context loader has right pageContainer set! Doesn't work from footer in showcase, because pageContainer or wrong selector, because footer is outside panel!!
		// context only works from menu...
		// fullwidth footer cannot load pages into footer
		// local/local toolbars, fixing footer does not work on first page & sticky footer = null, probably because of panel and wrapper
		// popover in fullwidth takes forever to show
		// can't load externally from global header because fromPage is not defined
								
		// ==== HISTORY PRIO ====
		// sync crumbs button and back button if both active at the same time
		// back button on external pages added to DOM does not work, only if push-state supported!								
		
		
		// README - adjust padding for global header/footer, adjust backbutton for global header/footer, possibly fixed history starting from either a wrapper or regular JQM page
		
(function( $, window) {	
	
	$.widget("mobile.multiview",$.mobile.widget, {
		
		// configurable options
		options: {			
			// switchable option = hide/show menu in splitview mode
			switchable: false,
			switchableIcon: 'gear',
			switchableHideOnLoad: false,
			
			// menu
			menuWidth: '25%',
			menuMinWidth: '250px',
			
			// deeplinking for pages not loaded from the start			
			externalSiteMap: {},
			
			// positioning
			fixedElemTopMargin: '',
			fixedElemBotMargin: '',
			
			// splitview/popover threshold width
			$thresh: 768
			},		
				
		// fixed options		
		vars: {			
			
			// mimic JQM $ignoreNextHashChange
			$ignoreMyOwnNextHashChange : false,		
			
			// block hashChanges originating from crumbs back-button
			$crumbsBlockStackUp: false,
			
			// block scrollTop on transitions inside a popover
			$panelTransBlockScrollTop:'',
			
			// keep up with window.history
			$windowHistoryCounter:0,
			
			// make hashChange backward transitions sure to pass ignoreMyOwnNextHashChange
			$hashJoker:0,	

			// block 2nd hashchange on context transitions
			$contextBlockNextHashChange:'',
			
			// block popover panel closing on a context transition
			$blockContextScrollTop:'',
			
			// remember stack length at init
			$jqmHistoryStackAtInit:''
			
			
		},

		_create: function() {		
			
			var self = this;			
			
			// add support touch class
			if($.support.touch){
				$('html').addClass('touch');
				}
			
			// need to add active-page before JQM does it, so plugin computing values work
			$('div:jqmData(wrapper="true") ').addClass('ui-page-active');
						
			// remember JQM stack length, needed to be able maintain stackheight while navigating through a plugin page
			self.options.$jqmHistoryStackAtInit = $('div:jqmData(wrapper="true")').jqmData('external-page') == true ? $.mobile.urlHistory.stack.length : 1;
			// console.log("jqmHistory frozen at="+self.options.$jqmHistoryStackAtInit);
			
			// add multiview classes
			$('html').addClass('multiview');							
			$("div:jqmData(role='panel')").addClass('ui-mobile-viewport ui-panel');						
			
			// needed here (popovers, main/menu will be done by splitview setup)
			$("div:jqmData(panel='fullwidth')").addClass('ui-panel-active');				
			
			// default: historyBase is false and panel-history is off
			$('html').data({'backAtBase':true});
			$('div:jqmData(hash="history")').data("history","off");
			
			// pagecreate seems to work on panels... 
			$('div:jqmData(hash="history")').live('pagecreate', function() {												
				// this should only fire if history is off or undefined. If you start from a multiview page, all data-hash="history" panels' stacks are initiated
				// they stay active until this page is dropped from the DOM. If you go back, then they are re-initiated again.
				// if the respective page is the first page in the DOM, the history simply stays active, so "going" to another page and coming back does not 
				// trigger a history-stack re-initialization
				if ( $(this).data("history") == "off" || typeof $(this).data("history") == 'undefined' ) {						
					$(this).data("history", "on");						
					$(this).data("stack", []);
					$(this).data("stack").push('#'+$(this).find('div:jqmData(show="first")').attr('id'));												
					}
				
				});
										
			// setup			
			self.panelDeepLink();
			// commented out because it also fires from _mainEvents pageshow binding (so avoid calling twice)			
			// self.setupSplitview("from init");
			self._setupPopovers();
			self._mainEventBindings();						
		},
		
		setupSplitview: function(event) {
			
			var self = this, 
				$globalHeadewr, $globalFooter;
			
			// enhance first pages on all panels
			firstPage=$('div:jqmData(role="panel") > div:jqmData(show="first")')
							.addClass($.mobile.activePageClass).trigger('create').page();	
			
			// add global header/footer classes and padding
			if ( $('div:jqmData(wrapper="true") div:jqmData(role="panel")').length ) {	
			
				$globalHeader = $('div:jqmData(wrapper="true") ').children('div:jqmData(role="header")').addClass('ui-header-global'),
				$globalFooter = $('div:jqmData(wrapper="true") ').children('div:jqmData(role="footer")').addClass('ui-footer-global');												
				}
			
			// add internal page status on all panel pages to enable panel-cache
			$('div:jqmData(wrapper="true") div:jqmData(role="page")').attr('data-internal-page', 'true');
			  
			// if a wrapper page is pulled into the DOM, it doesn't get data-urls, need to assign by hand
			$('div:jqmData(wrapper="true"):jqmData(external-page="true") div:jqmData(role="page")').each(function(index) {				
				$(this).attr('data-url', $(this).attr('id') );
				});
			
			
			// if panels, fire splitscreen
			if ( $("div:jqmData(panel='main')").length ||  $("div:jqmData(panel='menu')").length || $("div:jqmData(panel='fullwidth')") ) {
				self.splitScreen("init");
				} 
				
			// fire display mode set and page "make-up"
			self.gulliver();
			self.checkWidth();						
			self.panelHeight();						
			},

		// setup, toggling popovers
		_setupPopovers: function() {
			
			var self = this, $show;				
			
			// setup
			// TODO: check historyCounter when popovers close! 
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')").each(function(index) {
				$(this).attr('status','hidden');
				// triangles
				// TODO: left/right also possible? - not visible on FF after switching from 1.0RC3 to 1.0
				if($(this).hasClass('ui-triangle-bottom')) {					
					$(this).append('<div class="popover_triangle"></div>');
					} else if ($(this).hasClass('ui-triangle-top')) {
						$(this).prepend('<div class="popover_triangle"></div>');
						}	
				
				// autoshow popover panel on load
				if ( $(this).jqmData("autoshow") == "once") {					
					
					$show = $(this).jqmData('id');
					// make sure only autoshows once
					$(this).jqmRemoveData("autoshow");
					
					// show panel when this page loads, need to wait for everything to finish loading
					window.setTimeout(function() {
						$('.toggle_popover:jqmData(panel="'+$show+'"):eq(0)').click();
						},10);
					}		
				});
				
			// close popovers - when the following happens:
			// (1) click on close button
			$('.closePanel').live('click', function () {
				hideAllPanels();				
				});			
			
			// (2) scrollStart on main or fullwidth panels
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('scrollstart', function() {
				hideAllPanels();
				});
			
			// (3) scrollStart on document
			$(document).scroll(function(){
				// only hide if not in fullscreen mode, no blocker has been set (necessary 
				// if new pages are loaded into DOM, appended to DOM - can't find scrollTop 
				// to block) or if this is a "scrollTop" initiated from a context transition 
				// (need to keep the initiating popover active)			
				if ( !$('html').hasClass('ui-fullscreen-mode') && self.vars.$panelTransBlockScrollTop == false && !self.vars.$blockContextScrollTop == true) {															
					hideAllPanels();
					// reset for next;
					self.vars.$panelTransBlockScrollTop == true; 
					}	
				self.vars.$blockContextScrollTop = '';
				});
			
			
			// (4) click or tap on main or fullwidth panel
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('click tap', function(event) {				
				if (!$(event.target).closest('.ui-popover').length && !$(event.target).closest('.toggle_popover').length) {															
					hideAllPanels();
				};
			  });

			// (5) changePage on main or fullwidth panel
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('pagebeforehide', function(event) {
				// not if this is because of a context transition							
				if ( self.vars.$contextBlockNextHashChange == false) {
					hideAllPanels();
					}
				});

			// (6) click of a link on a panel, which loads a page on another panel
			$('a').live('click', function () {								
				if ( $('html').hasClass('ui-fullscreen-mode') && $(this).jqmData('target') 
						&& $(this).jqmData('target') != $(this).closest('div:jqmData(role="panel")').jqmData('id') ){																		
					hideAllPanels();
					}
				});
				
			// (7) on orientationchange
			// works but breaks deeplinks
			// $(window).bind('orientationchange', function(event){ 
				// hideAllPanels();
				// });			 


			// hidePanels
			function hideAllPanels () {
				
				$('.toggle_popover').removeClass('ui-btn-active');	
						
				// run through all panels
				// TOOD: This works, but if I use self.vars.$popoverss it doesn't... always missing 1 element... 
				$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu'), .ui-fullscreen-mode div:jqmData(panel='menu')").each(function(index) {				
				
					if( $(this).attr('status') == 'visible' ) {
						$(this).attr('status', 'hidden')			
								// pop transition
								.addClass('reverse out')
								.hide('fast')								
								.removeClass('ui-panel-active')								
								.find(".ui-page-active")
									.not("div:jqmData(show='first')")
									.removeClass('ui-page-active')
								.find(".ui-btn-active")
									.removeClass('ui-btn-active');																								
				
						// fullscreen handler
						if ( $('html').hasClass('ui-fullscreen-mode') ) {
							//reactivate background panels
							$('.ui-panel-hidden').removeClass('ui-panel-hidden');
				
							//reactivate background pages							
							$('.reActivate').addClass('ui-page-active').removeClass('reActivate');
							}
				
						// clear history of active (= visible) popovers. Menu only included in popover-mode!
						// TOOD: check if the windowHistoryCounter needs to be reset here, too												
						if ( typeof $(this).data("stack") != 'undefined') {
							var i = $(this).data("stack").length;												
							while (i > 1) {
								 i = i-1;
								 $(this).data("stack").pop();
								}
							}
				
						// make sure all externally loaded pages inside this panel are dropped again
						// TODO: questions is if a panel-page like this is also cached by the browser						
						$(this).find('div:jqmData(external-page="true")').remove();
				
						}
					});
					// clean up pop() transition 
					window.setTimeout( function() {						
						$('div:jqmData(role="panel")').removeClass('reverse out pop');										
						}, 350);
						
					// clean up url and remove last visited page on panel from URL					
					var rem = $('html').data("rememberState");
					if (rem) {
						history.replaceState('null',rem.title,rem.url  );																
						}										
										
				}
			
			// show panel routine
			$('.toggle_popover').live('click', function(event) {
			
				// show/hide toggle
				var $correspond = $(this).jqmData("panel"),
					$switch = $('.ui-splitview-mode div:jqmData(panel="menu")'),
					$popPanel = $('div:jqmData(id="'+$correspond+'")');																	
				
				if ( $popPanel.attr('status') == 'visible' ) {																			
					
					// if there is a menu with class switchable and it's visible and the toggle-button for this menu was clicked
					if ( $switch && $switch.hasClass('switchable') && $switch.jqmData('id') == $correspond) {
						// run switchable											
						$switch.css('display','none').attr('status','hidden');
						self.checkWidth();
						} else {
							// regular panel routine
							// (8) clicking on active popover button closes this popover agin
							hideAllPanels();																		
							}
						
					} else {
						
						// show switch						
						if ( $switch && $switch.hasClass('switchable') && $switch.jqmData('id') == $correspond ) {
							$switch.attr('status', 'visible').css('display','block');	
							// update layout
							self.checkWidth();
							} else {
								// regular panel routine
								// (9) clicking on a not-active trigger button closes all other popovers first
								hideAllPanels();																											
								
								// calculate center position if trigger-class is provided
								if ( $popPanel.hasClass('ui-popover-center') ){							
									$popPanel.css("left", (($(window).width() - $popPanel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
									}
								
								// opens popover
								$popPanel.not('.ui-splitview-mode div:jqmData(panel="menu")').attr('status', 'visible')									 
										 // pop() transition
										 .addClass('ui-panel-active pop in')
											.show('fast')										
											.find('div:jqmData(show="first")')
												.addClass('ui-page-active');
								
								// clean up pop transition
								window.setTimeout( function() {							
									$popPanel.removeClass('in');							
									}, 350);																												
								
								// remembers url for history.replaceState() once panel closes again
								var $myState = {};					
									$myState.title = document.title;
									$myState.url = location.href;														
								$('html').data("rememberState", $myState);														
									
								// fullscreen handler	
								if ( $('html').hasClass('ui-fullscreen-mode') ) {							
									// hide background panel, so popover does not drop below it							
									$('div:jqmData(panel="main").ui-panel-active, div:jqmData(panel="fullwidth").ui-panel-active').addClass('ui-panel-hidden');
									
									//remove all other active pages to make sure popover is visible $popPanel.find('.ui-page-active')	
									//assign a reActivate flag to activate pages again once this panel hides
									$('.ui-page-active')
										.not( "div:jqmData(wrapper='true'), div:jqmData(id='"+$correspond+"') .ui-page-active" )
										.addClass("reActivate")
										.removeClass('ui-page-active');							
									}

								$(this).addClass('ui-btn-active');				
								}				
						}			
				});	
				
			},			
			
		// back button handling on panel pages
		crumble: function(event, data, page) {			
				var self = this;
				
				var $prevPage,
					onPage = $( '#'+page.attr('id') ),
					$crumPanel = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")'),
					$header = onPage.find('div:jqmData(role="header")').length != 0 
						? onPage.find('div:jqmData(role="header")') 
							: onPage.closest('div:jqmData(wrapper="true").ui-page-active').children('div:jqmData(role="header")');
					$leftBtn = $header.find('.ui-btn-left'),
					$backUp = $crumPanel.data("stack").length;
				
				// go back through the respective stack until first
				// entry not yield or onPage = current page is found
				// TODO: not nice.. = 
				for (i = $backUp-1; i>=0; i--) {					

					if ( $crumPanel.data("stack")[i] != "yield" && $crumPanel.data("stack")[i] != '#'+onPage.attr('id') ) {															
						var $prevPage = $crumPanel.data("stack")[i];						
						break;
						}					
					}	
					
					
				// crumbs												
				// TODO: separate this into data-hash="crumbs" and data-hasn="history"?
				if( $crumPanel.data('hash') == 'history' ){
							
					// if panel stack is > 1 it has a history, add button, unless it's the first page of panel
					if ( $backUp > 0 && onPage.jqmData("show") != "first")  {
						
						// add button
						var prevPageTitle = $( $prevPage ).find('div:jqmData(role="header") .ui-title'),
							prevText = prevPageTitle.length ? prevPageTitle.html() : $prevPage.replace(/[#]/, "");												
						
						crumbify( $leftBtn, $prevPage, prevText, onPage, $header );										
						
						} else if ( $backUp = 0) {														
							// panel has no history, remove any back button 
							$leftBtn.remove();									
							} 			
						}

			  function crumbify(button, href, text, page, header){				 				
					
					var targetID = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")').jqmData("id");					
					
					// no button - or already existing crumbs button																				
					if(!button.length || button.hasClass('ui-crumbs') == true ) {
					
							// clear old button and remove global header button if on first page of panel
							button.remove();
									
							// make new one 
							header.prepend('<a class="ui-crumbs ui-btn-left" data-icon="arrow-l"></a>');														
							
							button = header.children('.ui-crumbs').buttonMarkup();
							button.removeAttr('data-rel')
								    .jqmData('direction','reverse')
								    .attr({'href': href,
										   'data-target':targetID});
							button.find('.ui-btn-text').html(text);
						} else {							
							// if there's a button, merge existing button into two-button controlgroup made up of crumbs & original button
							var $currentTarget = button.attr('href'),
								$currentIcon = button.jqmData('icon'),
								$currentTitle = button.attr('title'),
								$currentText = button.text(),
								$currentRel = button.attr('rel');							
								// TODO: better than inserting plain controlgroup and enhanceing it?
								button.replaceWith('<div class="headLogg headerMenuLeft iconposSwitcher-div ui-corner-all ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="ui-crumbs ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-left" data-target="'+targetID+'" data-iconpos="left" data-inline="true" data-icon="arrow-l" data-role="button" href="#'+href+'" data-theme="a"><span class="ui-btn-inner ui-corner-left ui-controlgroup-last"><span class="ui-btn-text">'+text+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a><a class="toggle_popover ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-panel="menu" data-iconpos="left" data-inline="true" data-icon="'+$currentIcon+'" data-role="button" href="'+$currentTarget+'" rel="'+$currentRel+'" title="'+$currentTitle+'" data-theme="a"><span class="ui-btn-inner ui-corner-right"><span class="ui-btn-text">'+$currentText+'</span><span class="ui-icon ui-icon-plus ui-icon-shadow"></span></span></a></div>');
							}
				}
			}, 
			
		replaceBackBtn: function() {														
				
				var self = this;
				
				// TODO: this is not very flexible, improve
				// run through all links in menu with data-panel specified and replace the menu button with the previous button
				$('div:jqmData(panel="main") div:jqmData(role="page")').each(function(index) {

						var $header = $(this).find("div:jqmData(role='header')"), $btn, $oldButton;
						
						// check if a button was stored on this page = this will now be a controlgroup
						if ( $(this).jqmData('storeBtn') ) {
							// button stored, replace with button
							$btn = $(this).data("storeBtn");
							$oldButton = '<a class="ui-crumbs ui-btn-left ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-btn-up-a" data-icon="'+$btn.buttonIcon+'" data-role="button" href="'+$btn.buttonTarget+'" data-target="'+$btn.buttonTarget+'" data-theme="a"><span class="ui-btn-inner ui-btn-corner-all" aria-hidden="true"><span class="ui-btn-text">'+$btn.buttonText+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a>'																																																																																																														
							$header.children('.mergedButtons').replaceWith( $oldButton );	
								} else {
								// no button, just remove menu toggle button
								$header.children('.menuToggle').remove();
								}
												
						});			
				},
					
		popover: function () {
			
			var self = this,
				$menu=$('div:jqmData(id="menu")'),
				$main=$('div:jqmData(id="main")'),
				$popover=$('div:jqmData(panel="popover")'),
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');			
				
			$menu.addClass('ui-popover pop_menuBox ui-triangle-top ui-panel-active ui-element-fixed-top')
					.removeClass('ui-panel-left ui-panel-border-right')
					.attr('status','hidden')
					.css({'width':'25%', 'min-width':'250px'});							
			
			// need to correct page CSS, too, because of panel position:static
			$main.find('div:jqmData(role="page")').css({'width':'', 'min-width':''});	
			
			$('html').addClass('ui-multiview-active ui-popover-mode').removeClass('ui-splitview-mode');
												
			if($menu.hasClass('ui-triangle-top') ){					
				$menu.prepend('<div class="popover_triangle"></div>');
				}
			$main.removeClass('ui-panel-right')
					.addClass('ui-panel-active')
						.find('div:jqmData(role="page")').andSelf()
							.css({'width':'', 'margin-left':''});
						
						
									
					
			// only add ui-popover, if we are not in fullscreen mode, otherwise conflicting CSS	
			// TODO: think about relocating this to gulliver, because requires to change all popovers, too!
			if( !$('html').hasClass('ui-fullscreen-mode') ) {					
				$allPanels.addClass('ui-popover').removeClass('pop_fullscreen');					
				} else {	
					$allPanels.addClass('pop_fullscreen').removeClass('ui-popover');						
					}									

			self.popoverBtn("plain");	
			},
				
		splitView: function () {			
							
				var self = this,
					$menu=$('div:jqmData(id="menu")'),
					$main=$('div:jqmData(id="main")'),
					$both=$('div:jqmData(id="menu"), div:jqmData(id="main")'),
					$popover=$('div:jqmData(panel="popover")');										
										
				$menu.removeClass('ui-popover pop_menuBox ui-triangle-top ui-panel-visible ui-element-fixed-top')				
						.addClass('ui-panel-left ui-panel-active ui-panel-border-right')
						.removeAttr('status');
				
				// switchable allows to hide/show menu in splitview mode, too							
				if (self.options.switchable == true && self.options.switchableHideOnLoad == true) {
					$menu.css({'width':'', 'min-width':'', 'display':'none'}).attr('status','hidden');					
					} else {
						$menu.css({'width':'25%', 'min-width':'250px', 'display':''}).attr('status','visible');
						}
				
				$menu.children('.popover_triangle').remove();				
				$main.addClass('ui-panel-right ui-panel-active');	
				$menu.find('div:jqmData(show="first") .closePanel').remove();									
				$popover.removeClass('pop_fullscreen').addClass('ui-popover');							
												
				$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode');																					
						
				// insert toggle button
				if (self.options.switchable == false ) {					
					self.replaceBackBtn();	
					} else {				
						self.popoverBtn("switchable");
						}
				},
				
		popoverBtn: function ( buttonType ) {
			
			var self = this; 
			
			// loop through all main pages
			$('div:jqmData(panel="main") div:jqmData(role="page")').each(function(index) {
				var $header = $(this).find('div:jqmData(role=header)'),
					// this class tells JQM if the menu toggle button should be placed 
					// somewhere on the page vs. always placing in the header
					$flexPos = $(this).find('.ui-menu-button-flex'),
					$menuToggle = '<a data-iconpos="left" data-inline="true" data-icon="'+self.options.switchableIcon+'" data-role="button" href="#" data-theme="a" class="ui-btn-up-a ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle" data-panel="menu"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-corner-all"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-'+self.options.switchableIcon+' ui-icon-shadow"></span></span></span></a>',
					$button = $header.children('a.ui-btn-left:first-child');
				
				// check for alternative position
				if ( $flexPos.length ) {
					// drop menu button there
					$('.ui-menu-button-flex').append($menuToggle);
					
					} else if ( $button.length && $header.children('.menuToggle').length == 0 ) {
										
						// store old button and merge into controlgroup
						var $btn = {};												
							$btn.buttonTarget = $button.attr('href');
							$btn.buttonIcon = $button.jqmData('icon');						
							$btn.buttonText = $button.text();						
							$btn.buttonTarget = $button.jqmData('target');
						
						$(this).jqmData('storeBtn',$btn);					
						$button.replaceWith('<div class="mergedButtons ui-corner-all ui-controlgroup ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="ui-controlgroup-btn-notext ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-notext ui-corner-left" data-iconpos="notext" data-inline="true" data-target="'+$btn.buttonTarget+'" data-icon="'+$btn.buttonIcon+'" data-role="button" href="'+$btn.buttonTarget+'" rel="'+$btn.buttonRel+'" title="'+$btn.buttonTitle+'" data-theme="b"><span class="ui-btn-inner ui-corner-left"><span class="ui-btn-text">'+$btn.buttonText+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a><a class="popover-btn toggle_popover ui-controlgroup-btn-left ui-btn ui-btn-up-b ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-iconpos="left" data-inline="true" data-panel="menu" data-icon="menu" data-role="button" href="#" data-theme="b"><span class="ui-btn-inner ui-corner-right ui-controlgroup-last"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></a></div>');	
												
						} else {					
							// otherwise insert plain menu button if no button exists
							$header.prepend($menuToggle);							
							}
						
				});
						
				// switchable option, this also allows to hide the menu in splitscreen mode					
				if (buttonType == "switchable") {
					$('div:jqmData(panel="menu")').addClass('switchable');						
				}
			},
								
		splitScreen: function( event ) {	
			
			var self = this,
				$window=$(window);						
			
			if(event) {				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > self.options.$thresh)  {																		
						self.splitView();
						} else {						
							self.popover();
							}					 
					}
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > self.options.$thresh) {												
						self.splitView();						
						} else {								
							self.popover();
							}
						// click, resize, init events
						// TODO, block trash-events "from Triggers etc."
						} else if ($window.width() < self.options.$thresh){	
							self.popover();
							}
							else if ($window.width() > self.options.$thresh) {
								self.splitView();
								}		
				}	
			}, 
			
		context: function( object ) {	
				
				var self = this,
				// data-context handler - a page with a link that has a data-context attribute will load that page after this page loads				
				// original only allowed for menu<>main panel context loading. By adding data-context-panel attribute this is now more flexible
				// TODO: does this need a refresh option?
					$context = object,
					$targetPanelID = $context.jqmData('context-panel');
				
				// in fullscreen mode, no context loading is possible
				// because which page to show?
				if ( !$('html').hasClass('ui-fullscreen-mode') ) {
					
					// make sure the pageContainer is correctly set for the 2nd transition
					$.mobile.pageContainer = $('div:jqmData(panel="'+$targetPanelID+'")');

					// context changePage
					$.mobile.changePage( $( $context.jqmData('context') ), { transition:'slide', changeHash:true, fromHashChange: false, pageContainer: $.mobile.pageContainer });															
					
					// block next hashChange transition
					//console.log("in context, block next hashChange = "+self.vars.$contextBlockNextHashChange);
					self.vars.$contextBlockNextHashChange = true;
							
					// TODO: I hoped this would fire with the regular pageChange-binding in mainEvents
					// but it does not. Need to fake event and data...
					// create fake objects
					var fakeEvent = {},
						fakeData = {};					
					
					// assign fake attributes needed to add panel history entries
					fakeEvent.target = $( 'div:jqmData(id="'+$context.jqmData("context-panel")+'")' );				
					fakeData.toPage = $( $context.jqmData('context') );		
						
					// add panel history entry for context transition
					self.stackUp("context", fakeEvent, fakeData);
								
					}
				
			},
		
		 				
		
		// scrollview handler
		scrollMe: function ( panel ) {					
					// page selector
					var $page = panel.find('div:jqmData(role="page")');
												
					if ($.support.touch && $page.data('scrollable', 'Off')) {
						$page.data('scrollable', 'On');
						$page.find('div[data-role="content"]').attr('data-scroll', 'y');

						$page.find("[data-scroll]:not(.ui-scrollview-clip)").each(function() {
							var $this = $(this);					
							
							// XXX: Remove this check for ui-scrolllistview once we've
							//      integrated list divider support into the main scrollview class.
							if ($this.hasClass("ui-scrolllistview")) {
								$this.scrolllistview();
							} else {								
								var st = $this.data("scroll") + "";								
								var paging = st && st.search(/^[xy]p$/) != -1;								
								var dir = st && st.search(/^[xy]/) != -1 ? st.charAt(0) : null;																
								
								var opts = {};
								
								if (dir) {
									opts.direction = dir;
									}
								if (paging) {
									opts.pagingEnabled = true;
									}
								var method = $this.data("scroll-method");								
								if (method) {
									opts.scrollMethod = method;
										}									
								$this.scrollview(opts);
								}
							});
						}
					},
			
		// helper
		// TODO: would be nice to reference from inside JQM
		findClosestLink: function (ele) {			
			var self = this;
			while (ele){
				if (ele.nodeName.toLowerCase() == "a"){
					break;
					}
				ele = ele.parentNode;
				}
			return ele;
			},
			
		// helper
		// TODO: would be nice to reference from inside JQM
		getClosestBaseUrl: function ( ele, documentBase ) {				
			var self = this;
						
			// Find the closest page and extract out its url.			
			var url = $( ele ).closest( ".ui-page" ).jqmData( "url" ),
				base = documentBase.hrefNoHash;
			if ( !url || !$.mobile.path.isPath( url ) ) {
				url = base;
				}
			return $.mobile.path.makeUrlAbsolute( url, base);
			},
		
		// helper
		// TODO: would be nice to reference from inside JQM
		// TODO: does this mess up layouting?		
		removeActiveLinkClass: function( forceRemoval ) {		
			if( !!$activeClickedLink && ( !$activeClickedLink.closest( '.ui-page-active' ).length || forceRemoval ) ) {		
				$activeClickedLink.removeClass( $.mobile.activeBtnClass );
				}		
			$activeClickedLink = null;
			},
			
			
		// layouting functions
		gulliver: function() {
			
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")'),
				$popPanels = $('div:jqmData(panel="popover")');

			var	maxHeight = 0;
			
			// determine whether popover height > available screen height 
			$popPanels.each(function(){					
					var checkHeight = $(this).css('height'),
						parsedHeight = parseFloat(checkHeight);
						
					if ( parsedHeight > maxHeight) {						
						maxHeight = parsedHeight;						
						}
					});
					
			// switch to fullscreen mode, if width < 320px OR popovers are bigger than screen height
			if ( self.framer() == "small" || maxHeight > $(window).height() ) {																
				
				// first make sure we are in popover mode, so the screen is not split if the window
				// is for example 500px x 100px
				self.popover();

				// tweak for fullscreen mode
				$allPanels.removeClass('ui-triangle-top ui-triangel-bottom ui-popover ui-popover-embedded')
						.addClass('pop_fullscreen')
						.find('.popover_triangle')
							.remove();
				
				// .iconposSwitcher - remove text on buttons in header to save space
				$(".iconposSwitcher-div a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');							

				$('html').addClass('ui-fullscreen-mode').removeClass('ui-splitview-mode ui-popover-mode');		
				
				} else {			
					
					// TODO: beware of splitview or popover mode...
					// TODO: not much happening here... 
					$('html').removeClass('ui-fullscreen-mode');
					
					}
					
			// initialize scrollview - only on touch devices MENU and POPOVERS, if not in fullscreen mode. 
			// other scenarios handled by device scrolling or desktop scrollbars
			if ( !$("html").hasClass('ui-fullscreen-mode')  && $("html").hasClass('touch') ) {								
					self.scrollMe( $allPanels );			
				} 					
			

			$allPanels.each(function(index) {	
				// only fire if no back button exists, as this fires on resize, too...
				if ( $(this).find('.back_popover').length == 0 ) {
				
					// all panels' first pages' close-button
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="arrow-l"' : 'data-icon="back"'
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="a" class="back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
						$firstPage = $(this).find('div:jqmData(show="first")').not('.ui-splitview-mode div:jqmData(panel="menu") div:jqmData(role="page")');
						
					//TODO: do I need to page() again?
					$firstPage.page();
					$firstPage.find('div:jqmData(role="header") h1').before($backButton);					
					$(this).find('div:jqmData(show="first")').page();
					$firstPage.find('.back_popover').buttonMarkup();											
					}
				});		
			
			}, 
							
		checkWidth: function( fromWhere ) {					
					
			var self = this, 
				$width, $menu, $menuWidth;			
			
			// if menu panel width is set e.g. to width: 25%, min-width: 250px, the panels
			// will overlap if 25% < 250px until popover mode is fired. Corrected by this
			// TODO: now bound to or-change, also bind to resize?			
			if (self.framer() != 'small' && $('html').hasClass('ui-splitview-mode') ) {
			
				// need this timeout for Firefox, because need to make sure panel-height is done
				// before this fires. PanelHeight takes makes sure global-header/footer + active 
				// panels > screenHeight, thereby also hiding scrollbars. In Firefox, checkwidth
				// calculates element width before panelHeight is set, so without the timeout a
				// 17px blank space will result in FF. 
				window.setTimeout( function() {
					var $detour = $('div:jqmData(panel="menu")').offsetParent(),
						$menu = $('div:jqmData(panel="menu")'),
						$width = $detour.innerWidth(),
						// switchable option, use menu.width = 0, if menu is hidden in splitview mode
						$menuWidth = $menu.attr('status') == 'hidden' ? '0' : $menu.outerWidth();						
										
					// save this for later... gets width minus scrollbars across all browsers
					// if setting main panel with does not work, use $('body').innerWidth() - $menuWidth!
					
					// should always be like this, either menu width = 250, then its overall -250
					// or it's >250, then it also is width-menuWidth
					$('div:jqmData(panel="main")').css({'width':$width-$menuWidth});
					$('div:jqmData(panel="main") div:jqmData(role="page")').css({'margin-left':$menuWidth, 'width':$width-$menuWidth});
					$('div:jqmData(panel="menu") div:jqmData(role="page")').css({'width':$menuWidth});
				
					},10);
				}
	
			}, 
		
		panelHeight: function (page) {
				
				// sets height of background panels (should be getscreenHeight() less any 
				// global header/footer) the calculated height is inherited to panel-pages, 
				// this way getscreenheight effectivelyonly managed the wrapper page, with 
				// all nested panel and pages heights supposedly following along.

				var self = this,
					$activeWrapper = $('div:jqmData(wrapper="true").ui-page-active');
					$globalHeader = $activeWrapper.find('.ui-header-global:eq(0)'),
					$globalFooter = $activeWrapper.find('.ui-footer-global:last');	
				
				if ( $globalHeader.length ) {										
					$activeWrapper.find('div:jqmData(role="page") div:jqmData(role="content")')
							.css({'padding-top' : $globalHeader.outerHeight() });
					}
				// why not active? back buttons in global header?
				if ( $globalFooter.length ) {				
					$activeWrapper.find('div:jqmData(role="page") div:jqmData(role="content")')
						.css({'padding-bottom' : $globalFooter.outerHeight() });
					}
				
				
				// set panel height to getScreenHeight less global header/footer
				// this will only set panel-height! both wrapper and nested page
				// height is still set by  JQM getScreenHeight()
				$('div:jqmData(role="panel")').not('.ui-popover').css({'height': $.mobile.getScreenHeight()-$globalHeader.outerHeight() -$globalFooter.outerHeight()});													
				
			},
		
		
		framer: function () {
		
			var self = $(this);
				// layout mode - need to use $(window), because $this fails in IE7+8...
				// TODO: add supersize (TV)?
				if ($.mobile.media("screen and (max-width:320px)")||($.mobile.browser.ie && $(window).width() < 320)) {
					var framed = "small";
					} else if ($.mobile.media("screen and (min-width:768px)")||($.mobile.browser.ie && $(window).width() >= 768)) {
						var framed = "large";
						} else {
							var framed = "medium";
							}	
			return framed;			
			},			
			
		// panel navigation and panel hash routines
		// adding entries to panel history stacks
		stackUp: function (source, event, data) {
				//console.log("=====  panel UP, source= "+source+" =====");
				
				var self = this;													
		
				// block stack adding if this is a crumble transition
				// TODO: this shouldn't be here. Rather block inside panelTrans				
				if ( self.vars.$crumbsBlockStackUp == true ) {					
					self.vars.$crumbsBlockStackUp == false;
					return;
					}				
					
				var $targetPanel = $( event.target ),
					$targetPanelID = $targetPanel.jqmData('id'),					
					// if a new page was added into the DOM or into a panel data.toPage.attr 
					// will be undefined. The selector is the id of the pulled in page, 
					// (like #ext1.html) so setting targetPage to this id integrates 
					// it into the panel history navigation.
					$targetPage = typeof data.toPage.attr('id') == 'undefined' ? data.toPage.selector.replace(".html","") : '#'+ data.toPage.attr('id');					
				
				
				// if target panel has data-hash="history", add entry to panel stack			
				if ( $targetPanel.jqmData('hash') == 'history' ) {
					// if main or menu is the target both need to be increased. 
					// the targeted panel gets the targetPage as entry, the other one gets a "yield" entry
					
					// as both menu and main can be active in splitview mode, the highest hist.length does not
					// necessarily imply the back transition is on that panel. Therefore main and menu are 
					// increased evenly, and on back transitions, the last entry not being "yield" is used.								
					
					if ( $targetPanelID == 'menu' ) {							
						$('div:jqmData(panel="main")').data("stack").push("yield");
						$('div:jqmData(panel="menu")').data("stack").push($targetPage);						
						} else if ($targetPanelID == 'main') {																								
							$('div:jqmData(panel="menu")').data("stack").push("yield");
							$('div:jqmData(panel="main")').data("stack").push($targetPage);
							} else { 									
								$targetPanel.data("stack").push($targetPage);	
								}
												
					// make sure $.mobile.urlHistory stays at initial level
					var i = $.mobile.urlHistory.stack.length
					while (i> self.options.$jqmHistoryStackAtInit) {
						i = i-1;
						$.mobile.urlHistory.stack.pop();	
						}

					// keep count
					++self.vars.$windowHistoryCounter;
					
					// as a panel transition with active panel history was made,
					// back@base needs to be set to false. By only declarding inside
					// stackUp and stackDown, this will only be set once transitions
					// are made and not from init.
					// this is needed to allow JQM handleHashChange to take back over
					// once all panels are reset to base level
					$('html').data({'backAtBase':false});
					
					// also need a lastStand to block JQM from taking over with the last
					// panel transition
					$('html').data("lastStand", "standing");
					}
						
					/*
					console.log("length="+$.mobile.urlHistory.stack.length);	
					$.each($.mobile.urlHistory.stack, function(entry, element) {
						console.log("entry "+':' + element.url);					
						});						
					console.log("counter="+self.vars.$windowHistoryCounter);
					console.log("stackUp full "+$('div:jqmData(id="fullwidthPage")').data('stack') );
					console.log("stackUp pop1 "+$('div:jqmData(id="popover1")').data('stack') );
					console.log("stackUp pop2 "+$('div:jqmData(id="popover2")').data('stack') );
					console.log("stackUp menu "+$('div:jqmData(panel="menu")').data('stack') );
					console.log("stackUp main "+$('div:jqmData(panel="main")').data('stack') );					
					*/
			}, 
			
		// reduce panel history stacks
		stackDown: function ( source, whereToGo ) {
			// console.log("=====  panel DOWN, source= "+source+" =====");

			var self = this,
				getHash = $.mobile.path.parseUrl( whereToGo );
			
			if (getHash.hash) {
				var goTo = getHash.hash;
				} else {
					var goTo = '#'+getHash.href;
					}			
			
			var	$closestPanel = $( goTo ).closest('div:jqmData(role="panel")'),							
				$closestPanelID = $closestPanel.jqmData('id'),
				$panels = $('div:jqmData(hash="history")'),
				longest = [],
				longestLen = 0;
			
			if ( $closestPanelID == "menu" || $closestPanelID == "main") {
					
					$('div:jqmData(panel="main")').data('stack').pop();
					$('div:jqmData(panel="menu")').data('stack').pop();
					
					} else {					
						$closestPanel.data('stack').pop();					
						}
					
					// make sure $.mobile.urlHistory stays at initial level
					var i = $.mobile.urlHistory.stack.length
					while (i > self.options.$jqmHistoryStackAtInit) {
						i = i-1;
						$.mobile.urlHistory.stack.pop();	
						}					
						
					// keep score
					++self.vars.$windowHistoryCounter;
					
					/*		
					console.log("length="+$.mobile.urlHistory.stack.length);	
					$.each($.mobile.urlHistory.stack, function(entry, element) {
						console.log("entry "+':' + element.url);					
						});						
					console.log("counter="+self.vars.$windowHistoryCounter);			
					console.log("stackDown pop1 "+$('div:jqmData(id="fullwidthPage")').data('stack') );
					console.log("stackDown pop1 "+$('div:jqmData(id="popover1")').data('stack') );
					console.log("stackDown pop2 "+$('div:jqmData(id="popover2")').data('stack') );
					console.log("stackDown menu "+$('div:jqmData(panel="menu")').data('stack') );
					console.log("stackDown main "+$('div:jqmData(panel="main")').data('stack') );		
					*/
					
					// rountine for setting a flag for JQM to take back over
					// TODO: used elsewhere, too, bundle
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
							
					if ( longest.length/$panels.length == 1 ) {
						// back@base will only be set to TRUE from stackDown, this way
						// ensuring the inital base is not falsely interpreted as back@base.
						// This is needed to allow JQM handleHashChange to take over
						// once all panels are reset to base level and to block it from
						// doing anything while transitions are made on any panel
						$('html').data({'backAtBase':true});											
						}
					
		},
			
		// clear active button classes	
		clearActiveClasses: function ( trigger, useBruteForce, toPage, fromPage, link ) {										
				
				var self = this;
				
				// clear active buttons :-)
				if (link) {
					link.closest('.ui-btn').addClass('ui-clicked-me');
					link.closest('div:jqmData(role="page")').find('.ui-btn-active').not('.ui-clicked-me').removeClass('ui-btn-active');
					link.closest('.ui-btn').removeClass('ui-clicked-me');
					}

				// clear active links if to and from page are on the same panel
				if (toPage.closest('div:jqmData(role="panel")').jqmData("id") == fromPage.closest('div:jqmData(role="panel")').jqmData("id")  ) {																		
						// show active color for at least 1sec
						window.setTimeout( function() {
							fromPage.find('.ui-btn').removeClass( $.mobile.activeBtnClass );
						},1000 );
					} 
				
				
				// also clear active links if reverse transition on menu/main				
				if (trigger == "panelHash" && ( toPage.closest('div:jqmData(panel="main")') || toPage.closest('div:jqmData(panel="menu")') ) ) {
						window.setTimeout(function() {						
						$('div:jqmData(panel="main"), div:jqmData(panel="menu")').find(".ui-page-active .ui-btn").removeClass( $.mobile.activeBtnClass );
						},500 );
					}
				
														
			},
			
		// panel transition handler
		panelTrans: function (event) {
			
			var self = this,
			
			/* --------------------------- start JQM copy ------------------------ */
			// TODO: try referencing directly into JQM, this is duplicate code
			
			//existing base tag?
			$base = $('head').children( "base" ),

			//tuck away the original document URL minus any fragment.
			documentUrl = $.mobile.path.parseUrl( location.href ),

			//if the document has an embedded base tag, documentBase is set to its
			//initial value. If a base tag does not exist, then we default to the documentUrl.
			documentBase = $base.length ? $.mobile.path.parseUrl( $.mobile.path.makeUrlAbsolute( $base.attr( "href" ), documentUrl.href ) ) : documentUrl,

			//cache the comparison once.
			documentBaseDiffers = ( documentUrl.hrefNoHash !== documentBase.hrefNoHash );

			//base element management, defined depending on dynamic base tag support
			var base = $.support.dynamicBaseTag ? {

				//define base element, for use in routing asset urls that are referenced in Ajax-requested markup
				element: ( $base.length ? $base : $( "<base>", { href: documentBase.hrefNoHash } ).prependTo( $head ) ),

				//set the generated BASE element's href attribute to a new page's base path
				set: function( href ) {
					base.element.attr( "href", $.mobile.path.makeUrlAbsolute( href, documentBase ) );
				},

				//set the generated BASE element's href attribute to a new page's base path
				reset: function() {
					base.element.attr( "href", documentBase.hrefNoHash );
				}

			} : undefined;
			
			// link check		
			var link = $( self.findClosestLink(event.target) );
		  
			// If there is no link associated with the click or its not a left
			// click we want to ignore the click
			if ( !link || event.which > 1) {
				return;
				}

			var $link = $(link);
			
			/* --------------------------- end JQM copy ------------------------ */
			
			// check for target-panel specified in the link
			var $targetPanel=$link.jqmData('target');		
			
			if ($targetPanel) {				
				
				// stop JQM 
				event.preventDefault();
										
				/* --------------------------- start JQM copy ------------------------ */
				// TODO: try referencing directly into JQM, this is duplicate code
			
				//remove active link class if external (then it won't be there if you come back)
				var httpCleanup = function(){
					window.setTimeout( function() { self.removeActiveLinkClass( true ); }, 200 );
					};		  
							  
				//if there's a data-rel=back attr, go back in history
				if( $link.is( "div:jqmData(rel='back')" ) ) {
					window.history.back();
					return false;
					}

				var baseUrl = self.getClosestBaseUrl( $link, documentBase ),

				//get href, if defined, otherwise default to empty hash
				href = $.mobile.path.makeUrlAbsolute( $link.attr( "href" ) || "#", baseUrl );
	  
				//if ajax is disabled, exit early
				if( !$.mobile.ajaxEnabled && !$.mobile.path.isEmbeddedPage( href ) ){
					httpCleanup();
					//use default click handling
					return;
					}
			  
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
				var useDefaultUrlHandling = $link.is( "[rel='external']" ) || $link.is( "div:jqmData(ajax='false')" ) || $link.is( "[target]" ),
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
					isExternal = useDefaultUrlHandling || ( $.mobile.path.isExternal( href ) && !isCrossDomainPageLoad );		
															
				if( isExternal ) {
					httpCleanup();
					//use default click handling
					return;
					}

				//use ajax		 
				var transition = $link.jqmData( "transition" ),
					direction = $link.jqmData("direction"),
					reverse = (direction && direction === "reverse") ||
								// deprecated - remove by 1.0
								$link.jqmData( "back" ),
							
					//this may need to be more specific as we use data-rel more
					role = $link.attr( "data-" + $.mobile.ns + "rel" ) || undefined;
		
				/* --------------------------- end JQM copy ------------------------ */
				
				// panel transition vars
				var isRefresh = $link.jqmData('refresh'),				
					$targetContainer = $('div:jqmData(id="'+$targetPanel+'")'),					
					$targetPanelActivePage = $targetContainer.children('div.'+$.mobile.activePageClass),					
					$currPanel = $link.parents('div:jqmData(role="panel")'),
					$currPanelID = $currPanel.jqmData('id'),
					$currPanelActivePage = $currPanel.children('div.'+$.mobile.activePageClass),
					url = $.mobile.path.stripHash($link.attr("href")),
					from = undefined,
					hash = $currPanel.jqmData('hash');														
					
				//if link refers to an already active panel, stop default action and return
				if ($targetPanelActivePage.attr('data-url') == url || $currPanelActivePage.attr('data-url') == url) {				
					if (isRefresh) { //then changePage below because it's a pageRefresh request								
						
						$.mobile.changePage(href, {fromPage:from, transition:'fade', reverse:reverse, changeHash:false, pageContainer:$targetContainer, reloadPage:isRefresh});
						} else { //else preventDefault and return																
								event.preventDefault();
								return;
								}
					}
					//if link refers to a page on another panel, changePage on that panel
					else if ($targetPanel != $currPanelID) {					
						var from=$targetPanelActivePage,
							hashChange = $targetContainer.jqmData('hash') == 'history' ? true : false;														
						
						$.mobile.changePage(href, {fromPage:from, transition:transition, changeHash:hashChange, reverse:reverse, pageContainer:$targetContainer});
						}
						//if link refers to a page inside the same panel, changePage on that panel
							else {		
								// set scrollTop blocker to keep popover panels visible on loading a new page into the DOM
								if ( ( $targetContainer.jqmData("panel") || $currPanel.jqmData("panel") ) == "popover" ) {
									// set scrollTop blocker									
									self.vars.$panelTransBlockScrollTop = true;
									}
								
								var from=$currPanelActivePage,
									hashChange = $targetContainer.jqmData('hash') == 'history' ? true : false;
								$.mobile.pageContainer=$currPanel;														
								$.mobile.changePage(href, {fromPage:from, transition:transition, reverse:reverse, changeHash:hashChange, pageContainer:$currPanel});
								// TODO: still needed?
								$.mobile.activePage=$('div:jqmData(id="main") > div.'+$.mobile.activePageClass+', div:jqmData(id="fullwidth") > div.'+$.mobile.activePageClass);
								}																														
								
				// set a flag for pushState passing along the url to load. 
				// if pushState is supported and a new page is loaded (isPath),
				// JQM will grab the URL (which should be xyz.html and append
				// it to the wrapper page vs. replacing the wrapper page and 
				// breaking back button/history along the way. This flag will
				// be reset with every panelTransition and reset inside the
				// pushStateHandler
				$('html').data('pushStateFlag', url);
							
				// TODO: same as context, handler, create fakeEvent and fakeData
				var fakeEvent = {},
					fakeData = {};
					
				// assign fake attributes needed to add panel history entries
				fakeEvent.target = $targetContainer;				
				fakeData.toPage = $('#'+url);											
				
				// block stack adding if it was a crumbs based (reverse) transition				
				if ( self.vars.$crumbsBlockStackUp == false) {
					self.stackUp("panelTrans", fakeEvent, fakeData);						
					}	
				
				// call active class clearing				
				self.clearActiveClasses( "panelTrans", true, $('#'+url), from, $link );
						
				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body');  
				
														
				
				// return;
				}
				
				// make sure it's set to 0 if coming from Transitions
				self.vars.$runPanelHashOnce = 0;

				// set the Joker, to detect whether panelTrans fired
				// or not. In panelHash I can check for the joker.
				// if it's not set, panelTrans did not fire before,
				// so it would be a hashchange only transition and
				// then I can set $ignoreMyOwnNextHashChange accordingly
				// to allow subsequent hashChange (back button) transitions
				// to pass. 
				self.vars.$hashJoker = 0;
				
				// keep it false! 				
				self.vars.$ignoreMyOwnNextHashChange = false;	
				// console.log("self.vars.$ignoreMyOwnNextHashChange="+self.vars.$ignoreMyOwnNextHashChange);
			
				
		},
		
		// panel hashchange handler
		panelHash: function( e, hash, fullHash ) {
				
				// remove panelHash again
				var self = this;						
												
				// stop JQM 
				e.preventDefault();
				
				// JQM to and dialog hashkey
				var to = $.mobile.path.stripHash( hash ),
					dialogHashKey = "&ui-state=dialog",
				
					// check for history-panels
					$panels = $('div:jqmData(wrapper="true").ui-page-active div:jqmData(hash="history")'),
					n = $panels.length;
					
					// setup stack array
					longest = [],
					longestLen = 0;
			
				//transition is false if it's the first page, undefined otherwise (and may be overridden by default)	
				transition = ( $.mobile.urlHistory.stack.length === 0 || n == 0 ) ? "none" : undefined,

				// options
				changePageOptions = {
					transition: transition,
					changeHash: false,
					fromHashChange: true,
					pageContainer: null,
					};
				
				// --------------------------- panel history rountine ------------------------
				// works like this:
				// * every panel with data-hash="history" gets a history stack on panel-init
				// * panel stacks receive entries (hash only) on every changePage
				// * initial stack height = 1 = panel page withd data-show = first
				// * popover panel stacks only increase while visible and are reset to 1 when the panel hides
				// * popover panel stacks always supercede all other panels 
				// * = first undo the panel, then the rest
				// * main&menu stack increase together, so if you change page on menu
				// * main gets a "yield" entry. So they always have the same stack height
				// on every transition plugin checks all stacks for the heightest
				// a new array is created from the heighest stacks (may be more than one)
				// only when all panels are on the same height (should be =1) JQM is allowed
				// to do a regular hashChange.
				
				// example: 3 higehst stacks with 2 entries each, the combo-array longest[]
				// will contain 3 arrays [array1, array2, array3] and each array will contain two entries
				
				// if there are panels with active history, check them
				if (n) {
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
					}				
				
				// block hashChanges firing from regular JQM transition, 
				// when the plugin panel history is active, it keeps the
				// $.mobile.urlHistory.stack at length saved at init. 
				// Therefore a stack higher than 1 should not be possible 
				// on a wrapper.			
				/*
				console.log( $.mobile.urlHistory.stack.length );
				console.log( self.options.$jqmHistoryStackAtInit );
				if ( $.mobile.urlHistory.stack.length > self.options.$jqmHistoryStackAtInit ) {
					console.log("blocked 1");
					return;
					}
				*/

				// this blocks hashChange calls set from panel-based transitions
				// otherwise the panelHash will fire two transitions! 	
				// joker enables more than one subsequent backward transitions				
				if ( self.vars.$ignoreMyOwnNextHashChange == false  && self.vars.$hashJoker == 0 ) {	
					self.vars.$ignoreMyOwnNextHashChange = true;					
					self.vars.$hashJoker = 1;						
					return;
					}					
				// console.log("block if TRUE, self.vars.$contextBlockNextHashChange="+self.vars.$contextBlockNextHashChange);
				// first context hashChange is correctly blocked before, 
				// 2nd one passes and is stopped here
				if ( self.vars.$contextBlockNextHashChange == true ) {					
					self.vars.$contextBlockNextHashChange = false;
					self.vars.$blockContextScrollTop = true;					
					return;
					}
				
				// --------------------------- start JQM copy ------------------------ 
				// TODO: try referencing directly into JQM, this is duplicate code
				//existing base tag?
				var $base = $('head').children( "base" ),

				//tuck away the original document URL minus any fragment.
				documentUrl = $.mobile.path.parseUrl( location.href ),

				//if the document has an embedded base tag, documentBase is set to its
				//initial value. If a base tag does not exist, then we default to the documentUrl.
				documentBase = $base.length ? $.mobile.path.parseUrl( $.mobile.path.makeUrlAbsolute( $base.attr( "href" ), documentUrl.href ) ) : documentUrl;										

				// --------------------------- end JQM copy ------------------------ 								
				// (I)				
				if ( to ) {			
					to = ( typeof to === "string" && !$.mobile.path.isPath( to ) ) ? ( $.mobile.path.makeUrlAbsolute( '#' + to, documentBase ) ) : to;					
					
					// (1) TODO: remove longest.length/n, because it fails if main/menu at 2 = 2/2=1
					if ( n==1 || longest.length/n !== 1 || longestLen > 1 ) {  								
						// for example 4 stacks, height 2,2,2,4 > longest.length = 1 /n=4 = 0,25 = panelHistory
							
						// (a) first check if a popover is active with a stack>1, this will be reduced first
						var activePop = $('.ui-panel-active.ui-popover');																	
						
						if ( activePop.length>0 && activePop.data("stack").length > 1 ) {								
							var pickFromStack = activePop.data("stack"),
								gotoPage = pickFromStack[pickFromStack.length-2];															
							} else {								
								// (b) if all popovers are reset, check for highest fullwidth or main/menu panel								
								var gotoPage = self._mmHandler ( longest.length, longest, longestLen);																																								
								} 
						
							// need to declare fromPage here, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
							var fromPage = $( gotoPage ).closest('div:jqmData(role="panel")').find('.ui-page-active'),
								changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true, changeHash: false };						
							
							$.mobile.changePage ( gotoPage, changePageOptions );							
					
						} else {									
							// (2) basic setup of all panels, n=1, base setup, mimic JQM							
							// TODO check if this really works or if the counter needs to be used
							window.history.back();
							//window.history.go(-self.vars.$windowHistoryCounter);
							self.vars.$windowHistoryCounter = 1;
							return;
							}	
						
					// (II no "to")
					} else {

						// if "to" is not defined, it would be normal JQM, if not for the backwards transition
						// to the data-show="first" page on each panel. Since the URL doesn't show the #menu-1st, 
						// #main-1st, etc page at the beginning, a backward transition to this page result in #hash
						// being undefined, so we land here... and need the whole logic again
						// TODO: this has to be possible in a better way... 						
						
						// as we are going back to data-show=first, remove any global header crumbs button
						$('div:jqmData(wrapper="true").ui-page-active').find('.ui-header-global .ui-crumbs').remove();
						
						// (1) TODO: remove longest.length/n, because it fails if main/menu at 2 = 2/2=1
						if ( n==1 || longest.length/n !== 1 || longestLen > 1 ) { 
							var activePop = $('.ui-panel-active.ui-popover');
							// (a)							
							if ( activePop.length>0 && activePop.data("stack").length > 1 ) {									
								var pickFromStack = activePop.data("stack"),
									gotoPage = pickFromStack[pickFromStack.length-2];									
								} else {
									// (b)																			
									var gotoPage = self._mmHandler(longest.length, longest, longestLen);																								
									}
									
									var fromPage = $( gotoPage ).closest(':jqmData(role="panel")').find('.ui-page-active'),
									changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true, changeHash:false };						
									
									$.mobile.changePage ( gotoPage, changePageOptions );	
									
								} else {
									// (2)										
									// need to make a backward/forward transition here... first page of the app. 
									if( longest.length/n == 1 ) {												
											console.log("HASH, firstPage? II-2-x gotoPage="+gotoPage);
											// console.log("longest.length="+longest.length+" n="+n+" longest.length/n="+longest.length/n)
											window.history.back();	
											return;											
										} else {													
											var gotoPage = $.mobile.firstPage;											
											$.mobile.changePage( $.mobile.firstPage, changePageOptions );									
											}
										
									}

						}									
				
				// as we have now made a transition, we need to block the next one coming from behind
				// same as in changePage handler							
				// self.vars.$ignoreMyOwnNextHashChange = false;				
				self.vars.$ignoreMyOwnNextHashChange = false;																
				
				// reduce panel stacks
				// self.stackDown( "panelHash", gotoPage.replace(/[#]/, "") );
				self.stackDown( "panelHash", gotoPage );
				
				// call active class clearing
				// maybe not... because also fires with regular JQM transitions
				// TODO: COMMENT OUT
				// self.clearActiveClasses( "panelHash", true, $(gotoPage), fromPage );
				
				// not sure I need to set this.
				// $.mobile.firstPage[ 0 ] = gotoPage;	

				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body');  					
	
		},
		
		panelDeepLink: function () {
			
			// load deeplinked pages
			var self = this,
				// grab deeplink from HTML tag
				$deepPage = $( $('html').data("multiviewDeeplink") ),
				$deepPanel = $deepPage.closest('div:jqmData(role="panel")'),
				$deepPanelID = $deepPage.closest('div:jqmData(role="panel")').jqmData('id'),
				$deepFrom = $deepPanel.find('div:jqmData(show="first")'),
				$triggerButton;
				
			// if the deeplink page is on a popover
			if ( $deepPanel.jqmData("panel") == "popover" ) {
				// ugly selector...
				$triggerButton = $('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="fullwidth")').find('div:jqmData(show="first") .toggle_popover:jqmData(panel="'+$deepPanelID+'")');																								
				}
				
			// this needs a timeout, otherwise popovers will be closed
			// before opening by the last loading scrollTop (not sure, 
			// but deeplinked popovers won't open without a Timeout
			window.setTimeout(function(){
				// show popover if there is one
				if ($triggerButton) {
					$triggerButton.trigger('click'); 
					}
				// load deeplink page
				$.mobile.changePage($deepPage, {fromPage:$deepFrom, transition:"slide", reverse:true, changeHash:false, pageContainer:$deepPanel});
				},500);
			
			// tidy up HTML deeplink
			$('html').removeData("multiviewDeeplink");
			
			},
		
		// determines which panels to add entries to
		_mmHandler: function (howMany, longest, longestLen) {
						
			// (b-1), single highest panel can now only be a fullwidth panel
			if (howMany == 1) {
				var gotoPage = longest[0][longestLen-2].toString();
				// minus one								
				// var pickFromStack = $( longest[0][0] ).closest(':jqmData(role="panel")');
				// pickFromStack.data("stack").pop();
				return gotoPage; 
			}
			// (b-2) two highest panels, can only be menu/main
			if (howMany == 2) {
				var $last0 = longest[0][longestLen-1].toString(),
					$last1 = longest[1][longestLen-1].toString();								

				// main/menu (increase simultaneously - passive entry = "yield")
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
						} 
											
				// minus one on both
				// var $popLast0 = $( longest[0][0] ).closest(':jqmData(role="panel")');								
				// $popLast0.data("stack").pop();
				// var $popLast1 = $( longest[1][0] ).closest(':jqmData(role="panel")');								
				// $popLast1.data("stack").pop();								
				return gotoPage;			
			}
			
			/* 
			// (b-3)[may want to keep] working selector for more than 3 panels with highest stack
			if (howMany == 3) {
				var $last = [];
				for ( var i = 0; i < longest.length; i++) {							
					$last.push( longest[i][ longest[i].length - 1 ] );						  						  
					if ( $( $last[i] ).closest(':jqmData(role="panel")').jqmData('panel')  == "popover" ) { 
						var gotoPage = $last[i];
						}						  
					}
				return gotoPage;
				// need to reduce stacks!
				}
			*/
		},
		
		// almost done
		_mainEventBindings: function () {
		
			var self = this;
			
			// context loader check
			$(document).bind( "click", function( event ) {
				
				var link = $( self.findClosestLink(event.target) );
				
				// panel transition rountine
				if ( link && !link.is( ".toggle_popover" ) ) {
					self.panelTrans(event);
					} 	

				// context routine
				if ( link && link.jqmData('context') ) {
					self.context( link );					
					}
				
				});						
			
				
			// listener for plugin setup on trigger wrapper-page and subsequent wrappers added 
			// to the DOM. This also sets up crumbify buttons
			// TODO: Think about separating...			
			$('div:jqmData(role="page")').live('pagebeforeshow', function(event, data){							
				
				var $this = $(this);
								
				// if pageshow is for a wrapper-page, setup the plugin
				if ( $this.jqmData('wrapper') == true ) {
					
					// the setup for wrappers should only run once, which is
					if ( $this.data("counter") == 0 || typeof $this.data("counter") == 'undefined') {						
						self.setupSplitview(event);
						// .....hard... because it seems not possible to 
						// live('pagecreate/pageload/pageinit') to the wrapper
						// page alone. Such a binding fires with every panel
						// changepage, so it's not possible to set a flag on a wrapper 
						// to block the setup from firing more than once. Using "one"
						// instead of "live" also does not work, because then you
						// cannot catch the 2nd wrapper page loaded into the DOM.
						// $(this).die(), also doesn't seem to work. 
						
						// The whole thing is necessary, because the plugin setup
						// adds active-page to the first page on every panel. If
						// I let this fire with every changePage, the firstpage 
						// will never loose active-page and thus always be visible
						// If I omit this call, the 2nd wrapper page loaded into 
						// the DOM will not get the plugin setup and be blank.
						
						// What this does: The counter for the first wrapper page
						// is set to 0 on plugin-init so it runs through here once,
						// gets changed to 1 and thus is blocked from going through
						// again. If a new wrapper is loaded it doesn't have any , 
						// counter so I'm also letting "undefined" pass and then set 
						// the counter for this wrapper to 1, so on the next changePage,  
						// pageshow will fire on the wrapper page, but as counter is now 
						// 1, it will not run through here. This took a while...
						var inc = 1;
						$this.data("counter", 0+inc);						
						}
					// the crumbs part	
					// as it's a wrapper page we don't need crumble buttons on it, so stop here
					event.preventDefault();					
					} else if ( $this.closest('div:jqmData(role="panel")').jqmData('hash') && $this.jqmData("show") != "first" ){					
						// fires crumble every time a page is created
						// by checking for a closest panel, we ensure it's not fired on a regular JQM page!	
						// need to delay this, otherwise this runs before the history stacks are updated, 10ms seems enough
						window.setTimeout(function() {								
							self.crumble(event, data, $this );	
							}, 10);
						}
				});

						
			// fire splitviewCheck on orientationchange (and resize)
			$(window).bind('orientationchange', function(event){					
				self.splitScreen(event);
				self.panelHeight();
				self.checkWidth();
				});
						
			
			// panel history handler
			$(window).bind('hashchange', function(e) {				
				self.panelHash( e, location.hash, "#"+location.pathname );				
				});						
			
			
			// history stack management with crumbs buttons active
			$('.ui-crumbs').live('click', function() {				
				var $this = $(this),
					// global/local header
					$whereToGo = $this.closest('div:jqmData(role="page")').jqmData('wrapper') == true 
						? $this.attr('href') : $this.closest('div:jqmData(role="page")').attr('id')

				self.vars.$ignoreMyOwnNextHashChange = false;				
				self.vars.$crumbsBlockStackUp = true;				
				self.stackDown( "crumbs", $whereToGo );				
				});	
				
			}
			
			
			
	});
	
// plugin flag
$('html').data("lockup","unlocked");

// initialize plugin
var trigger = $('div:jqmData(wrapper="true")').live( 'pagecreate',function(event){ 
	
	// set flag to block plugin firing again
	if ($('html').data("lockup") == "unlocked") {
		
		// initialize a counter to avoid setup of plugin firing with every pageshow
		$( this ).data("counter",0);
		//$( this ).multiview({'switchable':true, 'switchableHideOnLoad':false });	
		$( this ).multiview({'switchable':true});
		$('html').data("lockup","locked");
	}
});

}) (jQuery,this);