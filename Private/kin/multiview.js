/*
* jQuery Mobile Framework : "panelview" plugin
* Copyright (c) Sven Franck
* Dual licensed under the MIT or GPL Version 2 licenses.
* Version 18.03.2012 
*/
		
(function( $, window) {	
	
	$.widget("mobile.multiview",$.mobile.widget, {
		options: {			
						
			switchable: false,			
			switchableHideOnLoad: false,
						
			menuTxt: 'Menu',
			menuBtnTheme: 'a',
			menuBtnIcon: 'gear',
			menuBtnIconPos: 'left',
			menuWidth: '25%',
			menuMinWidth: '250px',
			
			// deeplink sitemap
			externalSiteMap: [ ["#id", "url", "panel"] ],
								
			// mimic JQM $ignoreNextHashChange
			// $ignoreMyOwnNextHashChange : false,
			
			// block hashChange firing panelTransitions
			// $ignoreNextPageBeforeChange: false,
									
			// make hashChange backward transitions sure to pass ignoreMyOwnNextHashChange
			// $hashJoker:0,	
				
			// need this if pagination plugin is used
			// $blockPaginationHashChange: false,
			
			// remember stack length at init
			$jqmHistoryStackAtInit:'',
			
			// store click events
			$stageEvent: '',
			
			// avoid endless loops on panel transitions
			// $infinity: '',
													
			// block hashChanges originating from crumbs back-button
			// $crumbsBlockStackUp: false,
			
			// allow crumbs induced backwards transitions to pass hashchange blockers
			// $allowCrumbsHashToPass:false,
			
			// block scrollTop on transitions inside a popover
			$panelTransBlockScrollTop:'',
			
			// window history at first load
			$windowHistoryAtInit: window.history.length,					

			// in case history at init is already at max
			$windowHistoryManualCounter: 0,
			
			// block 2nd hashchange on context transitions
			$contextBlockNextHashChange:'',
			
			// block popover panel closing on a context transition
			$blockContextScrollTop:'',
			
			// splitview/popover threshold width
			$thresh: 768, 
			
			// Android multi-click-prevent
			$blockMultiClick: false

		},

		_create: function() {		
			
			var self = this, 
				baseClasses = $.support.touch ? 'touch multiview ui-plain-mode' : 'multiview ui-plain-mode', hist;
							
			// set base
			$('html').addClass( baseClasses ).data({'backAtBase':true});		
			
			// set click flag
			$('html').data({'clickInProgress':false});
			
			// store JQM stack height as fallback
			self.options.$jqmHistoryStackAtInit = $('div:jqmData(wrapper="true")').jqmData('external-page') == true ? $.mobile.urlHistory.stack.length : 1;									
				
			// set active index right away to prevent error on first back transition in iOS3
			// TODO: remove this again...
			$.mobile.urlHistory.activeIndex = self.options.$jqmHistoryStackAtInit;
					
			// setup panel history stacks
			$(document).on('pagecreate', 'div:jqmData(role="page").basePage', function() {								
				$('div:jqmData(hash="history")').each(function() {			
				
					hist = $(this);	
				
					// this should only fire if history is off or undefined. If you start from a multiview page, all data-hash="history" panels' stacks are initiated
					// they stay active until the page is dropped from the DOM. If you go back, then they are re-initiated again.
					// if the respective page is the first page in the DOM, the history simply stays active, so "going" to another page and coming back does not 
					// trigger a history-stack re-initialization									
					if ( hist.data("history") == "off" || typeof hist.data("history") == 'undefined' ) {											
						hist.data("history", "on");					
						hist.data("stack", []);
						hist.data("stack").push('#'+hist.find('div:jqmData(show="first")').attr('id'));												
						}
					});
				});		
				
			// global bindings					
			self._popoverBindings();
			self._mainEventBindings();	
			
		},
		
		setupMultiview: function(event, page) {
			
			var self = this,				
				$globalHeadewr, $globalFooter,
				$myState = {};					
			
			// remember this as long as wrapper page is in DOM. Once new wrapper page is added
			// this will be reset to the new wrapper
			// $myState.title = document.title;
			// $myState.url = location.protocol + '//' + location.host + location.pathname;	
			// $myState.role = document.role;		

			page								
				// attach to page, so we can a reset once we leaving this page
				// .data("rememberState", $myState )
				
				// add active-page before JQM does it, so plugin computing works
				.addClass( $.mobile.activePageClass )
				
				// add viewport
				.find("div:jqmData(role='panel')").addClass('ui-mobile-viewport ui-panel').end()			
				
				// set default panel history - not sure if this resets history on the first page loaded into the DOM!
				.find("div:jqmData(hash='history')").data("history","off").end()			
				
				// needed here (popovers, main/menu will be done by splitview setup)
				.find("div:jqmData(panel='fullwidth')").addClass('ui-panel-active').end()
				
				// add enhancement flag to popovers on page 
				.find("div:jqmData(panel='popover')").addClass("popEnhance").attr({'set':'off'}).end()
				
				// also on menu in popover-mode
				.closest('html.ui-popover-mode').find('div:jqmData(panel="menu")').addClass("popEnhance").attr({'set':'off'}).end()
				
				// add internal page status to all nested pages to enable panel-cache
				.find("div:jqmData(role='page')").attr('data-internal-page', 'true').end()
				
				// assign data-url by hand for pages pulled in externally
				// TODO: not nice, creates problems, when pages are pulled in which includes nested pages.
				.filter(':jqmData(external="true")').find('div:jqmData(role="page")').each(function() {			
					$(this).attr('data-url', $(this).attr('id') );
					}).end()
				
				// enhance first pages on all panels 
				.find('div:jqmData(role="panel") div:jqmData(show="first")').addClass( $.mobile.activePageClass );
					
				// doesn't work chained - need to call page, otherwise fromPage.data("page") is undefined on first panel transition!
				page.find('div:jqmData(role="panel") div:jqmData(show="first")').each( function() {				
					$(this).page();
					});
				
			// init popovers on wrapper page
			self._setupPopovers( page );
			
			// global header/footer classes and padding
			if ( page.find('div:jqmData(role="panel")').length > 0 ) {				
				$globalHeader = page.children('div:jqmData(role="header")').addClass('ui-header-global'),
				$globalFooter = page.children('div:jqmData(role="footer")').addClass('ui-footer-global');												
				}			
			
			// if panels, fire splitscreen
			if ( page.find( "div:jqmData(panel='main'), div:jqmData(panel='menu'), div:jqmData(panel='fullwidth')").length > 0 ) {							
				self.splitScreen("init");
				} 
				
			// fire display mode set and page "make-up"
			self.gulliver();
			self.checkWidth();						
			self.panelHeight();	
				
			},
			
		// popover panels setup
		_setupPopovers: function( page ) {
		
			var self = this, 
				show, pop;
						
			page.find(".popEnhance").each(function(i) {		
				
				pop = $(this);				
			
				if ( pop.attr('set') == 'off' ) {
					
					// flag
					pop.jqmData('set','ok');														
					
					// triangles
					if( pop.hasClass('ui-triangle-bottom')) {					
						pop.append('<div class="popover_triangle" />');
						} else if (pop.hasClass('ui-triangle-top')) {
							pop.prepend('<div class="popover_triangle" />');
							}	
					
					// autoshow
					if ( pop.jqmData("autoshow") == "once") {							
						show = pop.jqmData('id');						
						
						// show panel
						window.setTimeout(function() {										
							page.find(".toggle_popover:jqmData(panel='"+show+"'):eq(0)").click();							
							},10);
						
						// remove autoshow from DOM!
						pop.jqmRemoveData("autoshow").removeAttr('data-autoshow');																	
						}													
					}
				});
			
		},
		
		// popover panels toggle routine
		_popoverBindings: function() {
	
			var self = this,
				solo = false;	
		
			// (1) toggle button
			$(document).on('click','a.closePanel', function () {				
				self.hideAllPanels("#1");				
				});	

			// (2) scrollStart on panels
			$(document).on('scrollstart','div.ui-page-active div:jqmData(panel="main"), div.ui-page-active div:jqmData(panel="fullwidth")', function() {
				// prevent iOS keyboard hiding popover				
				if ( !$("input:focus").length > 0  ) {					
					self.hideAllPanels("#2");
					}
				
				})
			
			// (3) scrollStart on document
			$(document).on('scroll', function(){
				// only hide if not in fullscreen mode, no blocker has been set (necessary 
				// if new pages are appended to DOM - can't find scrollTop 
				// to block) or if this is a "scrollTop" initiated from a context transition 
				// (need to keep the initiating popover active)													
				if ( !$('html').hasClass('ui-fullscreen-mode') && self.options.$panelTransBlockScrollTop == false && !self.options.$blockContextScrollTop == true) {																							
					// prevent iOS keyboard hiding popover						
					if ( !$("input:focus").length > 0 ) {
						self.hideAllPanels("#3");
						}
					// reset for next;
					self.options.$panelTransBlockScrollTop == true; 
					}	
				self.options.$blockContextScrollTop = '';
				});
		
			// (4) click or tap the wrapper, not the popover
			$(document).on('click tap', function(event) {								
				// stop if click is on popover and popover-toggle button
				// or the menu in popover mode
				// or any custom select menus firing up... this list is getting to long.
				
				if ($(event.target).closest('div:jqmData(panel="popover"), div.pop_menuBox, .toggle_popover, .ui-selectmenu, .ui-selectmenu-hidden').length > 0 ) {											
					return; 
					}
					
				// make sure it only fires once			
				if ( solo == false ) {					
					solo = true;
					self.hideAllPanels("#10");
					window.setTimeout(function() { solo = false; },500);
					}
				
			});
		
			// (5) changePage on main or fullwidth panel
			$(document).on('pagebeforehide','div.ui-page-active div:jqmData(panel="main") div.ui-page-active, div.ui-page-active div:jqmData(panel="fullwidth") div.ui-page-active', function(event) {
				// not if this is because of a context transition							
				if ( self.options.$contextBlockNextHashChange == false) {					
					self.hideAllPanels("#5");
					}
				});
		
			// (6) click of a link on a panel, which loads a page on another panel
			$(document).on('click','div:jqmData(role="panel") a', function () {								

				if ( $('html').hasClass('ui-fullscreen-mode') && $(this).jqmData('panel') != $(this).closest('div:jqmData(role="panel")').jqmData('id') ){																							
					self.hideAllPanels("#6");
					}

				});
				
			// (7) on orientationchange
			// breaks deeplinks, no clue why
			// $(window).on('orientationchange', function(event){ 
			// 		self.hideAllPanels("#7");
			// 		});			 

			},

		// hide panels
		hideAllPanels: function(from) {

			var self = this; 
			
			// clear button
			$('.toggle_popover').removeClass('ui-btn-active');			
			// panel loop
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu'), .ui-fullscreen-mode div:jqmData(panel='menu')").each(function(index) {
				
				var $pop = $(this);
				
				if( $pop.is(':visible') ) {
					// pop transition
					$pop.addClass('reverse out')
						.hide('fast')	
						// clean up active classes
						.removeClass('ui-panel-active')								
							.find(".ui-page-active")
								.not("div:jqmData(show='first')")
								.removeClass('ui-page-active').end()
							.find(".ui-btn-active")
								.removeClass('ui-btn-active');																								
			
					// fullscreen handler
					if ( $('html').hasClass('ui-fullscreen-mode') ) {
						
						//reactivate background panels
						$('.ui-panel-hidden').removeClass('ui-panel-hidden');
			
						//reactivate background pages							
						$('.reActivate').addClass('ui-page-active').removeClass('reActivate');
						
						// reset background page height
						self.backPageHeight( '', "clear" )
						}
			
					// clear panel history
					self.historyDump($pop);
					
					// unwind window.history
					self.browserReset();
							
					// drop pages pulled into the panel from DOM										
					$pop.find('div:jqmData(external-page="true")').remove();		
			
					// clean up bleed-through Android clicks
					$('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');
					
					} else {
						// make sure panel is gone... not sure why status sometimes is hidden with panels visible when navigating between wrapper pages
						$pop.css('display','none');
					}
				});
				// clean up pop() transition 
				window.setTimeout( function() {						
					$('div:jqmData(role="panel")').removeClass('reverse out pop');										
					}, 350);
		
			},
			
		// show panels
		showPanel: function(e, $el) {
	
			var self = this,
				$correspond = $el.jqmData("panel"),
				$switch = $('.ui-splitview-mode div:jqmData(panel="menu")'),
				$popPanel = $('div:jqmData(id="'+$correspond+'")');																	
		
			if ( $popPanel.is(":visible") ) {																			
			
				// if there is a menu with class switchable and it's visible and the toggle-button for this menu was clicked
				// this now switches ALL menu panels in the DOM, so if there are two menu/main pages in the DOM both will
				// be switched. Doing it by data-id would mean to grab
				if ( $switch && $switch.hasClass('switchable') && $switch.jqmData('id') == $correspond) {
					// run switchable							
					$switch.css('display','none').addClass("switched-hide");						
					self.checkWidth();
					} else {
						// regular panel routine
						// (8) clicking on active popover button closes this popover agin
						self.hideAllPanels("#8");																		
						}
					
				} else {
					
					// show switch						
					if ( $switch && $switch.hasClass('switchable') && $switch.jqmData('id') == $correspond ) {
						$switch.css('display','block').removeClass("switched-hide");	
						// update layout
						self.checkWidth();
						} else {								
						
							// regular panel routine
							// (9) clicking on a not-active trigger button closes all other popovers first
							self.hideAllPanels("#9");																											
							
							// calculate center position if trigger-class is provided
							if ( $popPanel.hasClass('ui-popover-center') ){							
								$popPanel.css("left", (($(window).width() - $popPanel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
								}
								
							// show popover
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
								
							// fullscreen handler	
							if ( $('html').hasClass('ui-fullscreen-mode') ) {							
								// hide background panel, so popover does not drop below it							
								$('div:jqmData(panel="main").ui-panel-active, div:jqmData(panel="fullwidth").ui-panel-active').addClass('ui-panel-hidden');
								
								//remove all other active pages to make sure popover is visible $popPanel.find('.ui-page-active')	
								//assign a reActivate flag to activate pages again once this panel hides
								$('.ui-page-active')
										.not( "div:jqmData(wrapper='true'), div:jqmData(id='"+$correspond+"') .ui-page-active" )
										.addClass("reActivate")
										.removeClass('ui-page-active')																		
										
								// "fix" for Android bleeding through clicks... requires to disable background page buttons and 
								// inputs/selects while navigating overlay pages, otherwise click goes through to background page
								// http://code.google.com/p/android/issues/detail?id=6721								
								$('.ui-page').not( $popPanel.find('div:jqmData(role="page")') )
									.find(".ui-header").first().find(".ui-btn, input, select, textarea").addClass('ui-disabled androidSucks').attr('disabled','disabled')
								// and since Android never minds an disables everything... 
								$popPanel.find('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');
											
																						
								// get active or data-show first page on the panel
								var activePage = $popPanel.find('.ui-page-active'),
									firstPage = $popPanel.find('div:jqmData(show="first")'),
									refPage = activePage.length > 0 ? activePage : firstPage;
									
								// tweak background page height	to enable natural scrolling
								self.backPageHeight( refPage, "set" )
								}

							$el.addClass('ui-btn-active');				
							}				
					}
	
			},
			
		// back button handling on panel pages
		crumble: function(event, data, page) {			
	
				var self = this;

				var $prevPage,
					onPage = $( '#'+page.attr('id') ),
					$crumPanel = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")'),					
					
					// check if local or global header
					$header = onPage.find('div:jqmData(role="header")').length != 0 ? 
						onPage.find('div:jqmData(role="header")') : 
							onPage.closest('div:jqmData(wrapper="true").ui-page-active').children('div:jqmData(role="header")'),
					
					// what's left?
					$first = $header.find('.ui-btn-left').children(':first'),
					
					// if it's a button, grab it. if it's a button wrapper, grab it's first child
					$leftBtn = $header.find('.ui-btn-left.ui-btn').length ? 
						$header.find('.ui-btn-left.ui-btn') : 
							$first.hasClass('ui-controlgroup') ?
								$first.children(':not(.ui-crumbs)').first() :
									$first,
					
					$backUp = $crumPanel.data("stack").length;		
				
				// set button href - go back through the respective stack until first
				// entry not yield or onPage = current page is found
				for (i = $backUp-1; i>=0; i--) {					

					if ( $crumPanel.data("stack")[i] != "yield" && $crumPanel.data("stack")[i] != '#'+onPage.attr('id') ) {															
						var $prevPage = $crumPanel.data("stack")[i];						
						break;
						}					
					}	
					
				// TODO: separate this into data-hash="crumbs" and data-hasn="history"?
				if( $crumPanel.data('hash') == 'history' ){

					// if panel stack is > 1 it has a history, add button, unless it's the first page of panel
					if ( $backUp > 0 && onPage.jqmData("show") != "first")  {										
						
						var prevPageTitle = $( $prevPage ).find('div:jqmData(role="header") .ui-title'),
							prevText = prevPageTitle.length ? prevPageTitle.html() : $prevPage																				
						
						crumbify( $leftBtn, $prevPage, prevText, onPage, $header );																
						} 
					}

			  function crumbify(button, href, text, page, header){				 									

					var panelID = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")').jqmData("id"), 					
						$theme = header.jqmData('theme'),
						polish, controlgroup,
						newButton = $( "<a href='"+href+"' class='ui-crumbs iconposSwitcher-a' title='back' data-rel='back' data-panel='"+panelID+"'>"+text+"</a>" ).buttonMarkup({										
										shadow: true,	
										corners: true,
										theme: $theme,
										iconpos: "left",
										icon: 'arrow-l'
										})
					
					if ( button.length == 0) {
							// no button = insert newButton
							header.prepend( newButton.addClass('ui-btn-left') )
																																																																																																								  	
						} else if ( button && button.hasClass('ui-crumbs') == true ) { 
						
							// previous button = replace with new button
							button.replaceWith( newButton.addClass('ui-btn-left') );	
							
							} else {																				
								// previous controlgroup = replace with new controlgroup
								// first button not ui-crumbs from this controlgroup will be ported into new controlgroup
								// this works with button, selects, forms?
								newButton.addClass('ui-corner-left').removeClass('ui-btn-corner-all')
												.find('span.ui-btn-inner')
													.addClass('ui-corner-left').removeClass('ui-corner-top ui-corner-bottom')
								
								polish = button.hasClass('ui-btn') ? button : button.find('.ui-btn');
								
								polish.addClass('ui-corner-right').removeClass('ui-corner-top ui-corner-bottom ui-btn-corner-all')
												.find('span.ui-btn-inner')
													.addClass('ui-corner-right').removeClass('ui-corner-top ui-corner-bottom')
								
								controlgroup = $( document.createElement( "div" ) )
												.attr({'data-role':'controlgroup', 'data-type':'horizontal'})
												.append( newButton.add(button) ).controlgroup();															
								
								page.find('div.headWrapLeft div.ui-controlgroup').replaceWith( controlgroup )

											
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
							$oldButton = '<a class="ui-crumbs ui-btn-left ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-btn-up-a" data-rel="back" data-icon="'+$btn.buttonIcon+'" data-role="button" href="'+$btn.buttonTarget+'" data-panel="'+$btn.buttonTarget+'" data-theme="a"><span class="ui-btn-inner ui-btn-corner-all" aria-hidden="true"><span class="ui-btn-text">'+$btn.buttonText+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a>'																																																																																																														
							$header.children('.mergedButtons').replaceWith( $oldButton );	
								} else {
								// no button, just remove menu toggle button
								$header.children('.menuToggle').remove();
								}
												
						});	
				
				},
					
		popover: function () {
					
			
			var self = this,
				$menu=$('div:jqmData(panel="menu")'),
				$main=$('div:jqmData(panel="main")'),
			 // $popover=$('div:jqmData(panel="popover")'),
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');
			
			$menu.addClass('ui-popover pop_menuBox ui-triangle-top ui-panel-active ui-element-fixed-top')
					.removeClass('ui-panel-left ui-panel-border-right')
					.attr('status','hidden')
					.css({'width':'25%', 'min-width':'250px'}).end()
					.find('.ui-page .ui-content').addClass('overthrow');							
			
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
			// problem is, if this is done in gulliver, ui-popover will be reassinged here, after being
			// removed in Gulliver... timing has to be exact, first popover() then gulliver()
			if( !$('html').hasClass('ui-fullscreen-mode') ) {					
				$allPanels.addClass('ui-popover').removeClass('pop_fullscreen');					
				} else {	
					$allPanels.addClass('pop_fullscreen').removeClass('ui-popover');						
					}			
					
			self.popoverBtn("plain");
			
			},
				
		splitView: function () {			
													
				
				var self = this,
					$menu=$('div:jqmData(panel="menu")'),
					$main=$('div:jqmData(panel="main")'),
					$both=$('div:jqmData(panel="menu"), div:jqmData(panel="main")'),
					$popover=$('div:jqmData(panel="popover")');										
										
				$menu.removeClass('ui-popover pop_menuBox ui-triangle-top ui-panel-visible ui-element-fixed-top')				
						.addClass('ui-panel-left ui-panel-active ui-panel-border-right')
						.removeAttr('status').end()
						.find('.ui-page .ui-content').removeClass('overthrow');
				
				// switchable allows to hide/show menu in splitview mode, too							
				if (self.options.switchable == true && self.options.switchableHideOnLoad == true) {
					$menu.css({'width':'', 'min-width':'', 'display':'none'}).attr('status','hidden');	
						// $main.find( ".ui-page" ).css({ 'margin-left'})
					} else {
						$menu.css({'width':'25%', 'min-width':'250px', 'display':''}).attr('status','visible');
						}
				
				$menu.children('.popover_triangle').remove();				
				$main.addClass('ui-panel-right ui-panel-active');	
				$menu.find('div:jqmData(show="first") .closePanel').remove();									
				$popover.removeClass('pop_fullscreen').addClass('ui-popover');							
												
				$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode');																					
						
				// insert toggle button
				if (self.options.switchable == true || $menu.jqmData("switchable") == true) {					
					self.popoverBtn("switchable");
					} else {				
						self.replaceBackBtn();	
						}
						
				self.checkWidth();
				
				},
				
		popoverBtn: function ( buttonType ) {
					
			
			var self = this,
				
				// TODO: this is way too complex, because of all the optionalbe stuff. Can this be done easier?
				// active - in case two wrappers are in the DOM, each with menu, each with different menu properties				
				$active = $('div:jqmData(wrapper="true").ui-page-active'),
				$panelID = $active.find('div:jqmData(panel="menu")').jqmData('id'),
				
				// define placeholder for menu button
				$globalHeader = $active.find('.ui-header-global'),
				$localHeader = $active.find('div:jqmData(panel="main") div:jqmData(role="page") .ui-header'),
				$flexPos = $active.find('div:jqmData(panel="main") div:jqmData(role="page") .ui-menu-button-flex'),
				
				// set dropZone for menu button = this grabs all(!) relevant pages' headers
				$dropZone = $globalHeader.length ? 
					$globalHeader : $flexPos.length ? 
						$flexPos : $localHeader.length ? 
							$localHeader : $active.find('div:jqmData(panel="main") .ui-content'),						
			
				// menu button properties (to override defaults and vary for each menu)				
				$cusIcon = $active.find('div:jqmData(panel="menu")').jqmData('menu-icon'),
				$cusIconPos = $active.find('div:jqmData(panel="menu")').jqmData('menu-iconpos'),
				$cusTheme = $active.find('div:jqmData(panel="menu")').jqmData('menu-theme'),
				$cusTxt = $active.find('div:jqmData(panel="menu")').jqmData('menu-text'),
							
				// customize button
				$icon = $cusIcon ? $cusIcon : self.options.menuBtnIcon,	
				$text = $cusTxt ? $cusTxt : self.options.menuTxt,
				$iconpos = $cusIconPos ? $cusIconPos : self.options.menuBtnIconPos,
				$theme = $cusTheme ? $cusTheme : self.options.menuBtnTheme,
				
				// need later
				$menuToggle, $button, $btn;
				
			$dropZone.each(function(index) {				
			
				// menu button
				$menuToggle = '<a data-iconpos="'+$iconpos+'" data-inline="true" data-icon="'+$icon+'" data-role="button" href="#" data-panel="'+$panelID+'" data-theme="'+$theme+'" class="ui-btn-up-'+$theme+' ui-btn ui-btn-icon-'+$iconpos+' ui-btn-corner-all ui-shadow popover-btn iconposSwitcher-a toggle_popover menuToggle"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-text">'+$text+'</span><span class="ui-icon ui-icon-'+$icon+' ui-icon-shadow"></span></span></a>';								
				
				if ( $(this).find('.ui-btn-left').length == 0 ) {		
					// empty drop zone -> insert button
					if ( $flexPos.length ) {
						if ( !$(this).find('.menuToggle').length ) {							
							$(this).prepend($menuToggle);
							}
						}

																	
					} else {
						// found a previous .ui-btn-left, the tricky part
						// if it's a btn (e.g. back button) -> merge into controlgroup and set previous button to notext
						if ( $(this).find('.ui-btn-left.ui-btn').length ) {													
							$button = $(this).find('.ui-btn-left.ui-btn');
												
							$button.replaceWith('<div class="mergedButtons ui-corner-all ui-controlgroup ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="ui-controlgroup-btn-notext ui-btn ui-btn-up-'+$button.jqmData('theme')+' ui-btn-inline ui-btn-icon-notext ui-corner-left" data-iconpos="notext" data-inline="true" data-panel="'+$button.jqmData('panel')+'" data-icon="'+$button.jqmData('icon')+'" data-role="button" href="'+$button.attr('href')+'" rel="'+$button.attr('rel')+'" title="'+$button.attr('title')+'" data-theme="'+$button.jqmData('theme')+'"><span class="ui-btn-inner ui-corner-left"><span class="ui-btn-text">'+$button.text()+'</span><span class="ui-icon ui-icon-'+$button.jqmData('icon')+' ui-icon-shadow"></span></span></a>'+$menuToggle+'</div>');
							// fix classes and position
							$('.menuToggle').css({'position':'static'})
											.addClass('ui-controlgroup-btn-left ui-btn-inline ui-corner-right')
											.removeClass('ui-btn-corner-all ui-shadow popover-btn')
												.find('.ui-btn-inner')
													.addClass('ui-corner-right ui-controlgroup-last')
													.removeClass('ui-btn-corner-all');
							
							} else {
								// if it's a section of grouped elements inside the header (only used in plugin)
								// in this case drop the button after the first element in this button group
								// which can be a button or controlgroup, for example like this: 								
								// [ Back|Home Menu XYZ ] [ Title ]
								// only add a button if there is none already!
								if ( !$(this).find('.menuToggle').length ) {
									$(this).find('.ui-btn-left').children(":first").after($menuToggle);
									// make sure it's not pos:abs so the buttons align nicely
									$('.menuToggle').css({ 'position':'static'});
									}
								}
						}
					
				});
					
			// add switchable option
			// TODO: put somewhere else? 
			if (buttonType == "switchable") {
				$('div:jqmData(panel="menu")').addClass('switchable');						
				}							
			
			},
								
		splitScreen: function( event ) {	
					
			
			var self = this,
				$window=$(window);						
			
			if ( $('div:jqmData(wrapper="true")').find('div:jqmData(panel="menu"), div:jqmData(panel="main")').length == 0 ) {				
				return;
				}
				
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
					self.options.$contextBlockNextHashChange = true;
							
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

		
			
		// helper
		// TODO: would be nice to reference from inside JQM
		findClosestLink: function ( ele ) {

				while ( ele ) {
					// Look for the closest element with a nodeName of "a".
					// Note that we are checking if we have a valid nodeName
					// before attempting to access it. This is because the
					// node we get called with could have originated from within
					// an embedded SVG document where some symbol instance elements
					// don't have nodeName defined on them, or strings are of type
					// SVGAnimatedString.
					if ( ( typeof ele.nodeName === "string" ) && ele.nodeName.toLowerCase() == "a" ) {
						break;
					}					
					ele = ele.parentNode;					
				}
				return ele;
			},
			
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
				
				// make sure we popover mode is fired, so the screen is not split if the window
				// is for example 500px x 100px. Only if there are menu/main panels of course
				if ( $('div:jqmData(wrapper="true").ui-page-active').find('div:jqmData(panel="menu"), div:jqmData(panel="main")').length > 0 ) {
					self.popover();
					}
				
				// tweak for fullscreen mode
				$allPanels.removeClass('ui-triangle-top ui-triangel-bottom ui-popover ui-popover-embedded')
						.addClass('pop_fullscreen')
						.find('.popover_triangle')
							.remove();				
				
				// .iconposSwitcher - remove text on buttons in header to save space - clean this up
				$(".iconposSwitcher-div .ui-btn").not('.noSwitch').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-select").find('.ui-icon').css({'display':'none'})
				$(".iconposSwitcher-div label, .iconposSwitcher-select label, .hideLabel").addClass("ui-hidden-accessible");								
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');											
				$(".iconposSwitcher-input").closest('.ui-btn').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				
				$(".noIconposSwitcher-div .ui-btn").attr('data-iconpos','none').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-none');

				// set a listener to adapt height of all active pages to the height of the page currently in view. 
				// if you have a long page in the background and fire a popover in fullscreen mode, the page length 
				// should match the popovers active page length, otherwise the background page is visible underneath
				$(document).on('pagebeforeshow', $popPanels.find('div:jqmData(role="page")'), function () {													
					self.backPageHeight( $(this), "set" );
					});
				
				$('html').addClass('ui-fullscreen-mode').removeClass('ui-splitview-mode ui-popover-mode');		
				
				} else {			
					
					// TODO: beware of splitview or popover mode...
					// TODO: not much happening here... 
					$('html').removeClass('ui-fullscreen-mode');
					$popPanels.addClass('ui-popover');					
					}
					
			// initialize scrollview - only on touch devices MENU and POPOVERS, if not in fullscreen mode. 
			// other scenarios handled by device scrolling or desktop scrollbars
			// if ( !$("html").hasClass('ui-fullscreen-mode')  && $("html").hasClass('touch') ) {
					// only popovers! to include menu use $allPanels
					// self.scrollMe( $popPanels );			
				// } 					
			

			$allPanels.each(function(index) {	
				// only fire if no back button exists, as this fires on resize, too...
				if ( $(this).find('.back_popover').length == 0 ) {
				
					// all panels' first pages' close-button
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="back"' : 'data-icon="close"'
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
					var $detour = $('div:jqmData(wrapper="true").ui-page-active');
						// doesn't work anymore with Jquery 1.7.1
						// because on show = basePage on hide = body, messes up postioning
						// $detour = $('div:jqmData(panel="menu")').offsetParent(),
						$menu = $('div:jqmData(panel="menu")'),
						$width = $detour.innerWidth(),
						// switchable option, use menu.width = 0, if menu is hidden in splitview mode
						$menuWidth = !$menu.is(":visible") ? 0 : parseFloat($menu.outerWidth());																			
						
					// should always be like this, either menu width = 250, then its overall -250
					// or it's >250, then it also is width-menuWidth
					$('div:jqmData(panel="main")').css({'margin-left':$menuWidth, 'width':$width-$menuWidth});
					$('div:jqmData(panel="main") div:jqmData(role="page")').css({'margin-left':$menuWidth, 'width':$width-$menuWidth});
					$('div:jqmData(panel="menu"):not("ui-popover") div:jqmData(role="page")').css({'width':$menuWidth});
				
					},10);
				} else if ( $('html').hasClass('ui-popover-mode') ) {
					$('div:jqmData(panel="menu") div:jqmData(role="page")').css({'width':''});					
					}
		
			}, 
			
		backPageHeight: function (page, mode) {
				
			var allActive = $('.ui-page').not( page ), maxHeight;
			
			// only tweak page height if a popover panel is opened
			if ( $('div:jqmData(panel="popover") .ui-page-active').length > 0 && mode == "set" ) {
				
					// reference height
					maxHeight = page.outerHeight();					

					// remember
					allActive.addClass("shrunk").css({	'height': maxHeight-1,
														'overflow': 'hidden' })					
				}	
				// always try to clear
				if ( mode == "clear")  {						

						$('.shrunk').each( function() {
							allActive.css({'height': '', 
										   'overflow': 'visible' })
							}).removeClass('shrunk');						
						}
					
			},
		panelHeight: function (page) {
			
				
				var self = this,
					$activeWrapper = $('div:jqmData(wrapper="true").ui-page-active'),
					$panels = $activeWrapper.find('.ui-panel:not(.ui-popover)'),
					$setHeight, $barrier;
				
				$globalHeader = $activeWrapper.find('.ui-header-global:eq(0)');
				$globalFooter = $activeWrapper.find('.ui-footer-global:last');
				
				if ( $globalHeader.length ) {						
					$panels.find('div:jqmData(role="page") div:jqmData(role="content")')
							.css({'padding-top' : $globalHeader.outerHeight() });							
					}
				// why not active? back buttons in global header?
				if ( $globalFooter.length ) {				
					$panels.find('div:jqmData(role="page") div:jqmData(role="content")')
						.css({'padding-bottom' : $globalFooter.outerHeight() });						
					}
				
				$setHeight = $.mobile.getScreenHeight()-$globalHeader.outerHeight() -$globalFooter.outerHeight();
				// set panel height to getScreenHeight less global header/footer
				// this will only set panel-height! both wrapper and nested page
				// height is still set by  JQM getScreenHeight()										
				$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth"), div:jqmData(panel="menu")').css({'height': $setHeight});
				
				// set overthrow content height if not in fullscreen mode (handled by backpageheight!) 
				// or popovers, which inherit height of content from parent elements
				if ( !$('html').hasClass('ui-fullscreen-mode') ) {					
					// not sure why I need to deduct the footer again...
					$('div:jqmData(panel="menu"):not(".pop_menuBox")').find( "div:jqmData(role='page') div:jqmData(role='content').overthrow").css({'height': $setHeight-$globalFooter.outerHeight()});					
					}
				
				
				// menu needs to overwrite this again, otherwise does not 
				// work on iPad on orientationchange...
				if ( $('html').hasClass('ui-popover-mode') ) { 
					$('div:jqmData(panel="menu")').css({'height':''});
					} 
		
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
		
		browserReset: function () {
				
			var self = this, distance;
			
			// since transitions inside panels also register entries in the window history, 
			// this unwinds the window history by entries made from panel transitions			
			distance = self.options.$windowHistoryManualCounter;
			// need to if this, otherwise iPad keeps reloading the page... 
			if ( distance > 0 ) window.history.go(-self.options.$windowHistoryManualCounter);			
			},
	
		historyDump: function( panel ) {
			
			var self = this,
				$panels = panel;			
							
			// run through everything that's passed
			$panels.each(function(){
				// clear history of active (= visible) popovers. Menu only included in popover-mode!				
				if ( typeof $(this).data("stack") != 'undefined') {
					var i = $(this).data("stack").length;												
					while (i > 1) {
						 i = i-1;
						 $(this).data("stack").pop();
						}
					}
				});			
					
			// clean up url and remove last visited page on panel from URL
			// ipad errors "type of expression" undefined if I have not done a transition, so
			// I'm also checking for base						
			// var rem = $('div:jqmData(wrapper="true").ui-page-active').data("rememberState");
			
			// if (rem && typeof rem != 'undefined' && $('html').data('backAtBase') != true ) {	
				// history.replaceState('null',rem.title,rem.url  );																
				// }		
				

			},
		
		// panel navigation and panel hash routines
		// adding entries to panel history stacks
		stackUp: function (source, event, data) {
		//	console.log("=====  panel UP, source= "+source+" =====");
													
				var self = this;														
				
				var $targetPanel = $( event.target ),
					$targetPanelType = $targetPanel.jqmData('panel'),					
					// if a new page was added into the DOM or into a panel data.toPage.attr 
					// will be undefined. The selector is the id of the pulled in page, 
					// (like #ext1.html) so setting targetPage to this id integrates 
					// it into the panel history navigation.
					obj = $.mobile.path.parseUrl( data.toPage );
				
					// TODO: this stinks, makes ext1.html into #ext1, which will cause all kind of problems when retrieving and loading a page from it :-)
					$targetPage = obj.hash != "" ? obj.hash : typeof data.toPage.attr('id') != undefined ? '#'+data.toPage.attr('id') : obj.filename.replace(".html","")
						
				// if target panel has data-hash="history", add entry to panel stack			
				if ( $targetPanel.jqmData('hash') == 'history' ) {
					// if main or menu is the target both need to be increased. 
					// the targeted panel gets the targetPage as entry, the other one gets a "yield" entry
					
					// as both menu and main can be active in splitview mode, the highest hist.length does not
					// necessarily imply the back transition is on that panel. Therefore main and menu are 
					// increased evenly, and on back transitions, the last entry not being "yield" is used.													
					if ( $targetPanelType == 'menu' ) {		
						// console.log("menu transition");
						$('div:jqmData(panel="main")').data("stack").push("yield");
						$('div:jqmData(panel="menu")').data("stack").push($targetPage);						
						} else if ($targetPanelType == 'main') {																								
							// console.log("main transition");
							$('div:jqmData(panel="menu")').data("stack").push("yield");
							$('div:jqmData(panel="main")').data("stack").push($targetPage);
							} else { 		
								// console.log("popover transition");
								$targetPanel.data("stack").push($targetPage);	
								}
					
						// increase manual counter, if new page is not in the panel history stack already
						// I guess, because window.history will not include double entries
						if ( $.inArray($targetPage, $targetPanel.data("stack") ) != -1 ) {													
							++self.options.$windowHistoryManualCounter
							}						
						
						// as a panel transition with active panel history was made,
						// back@base needs to be set to false. By only declarding inside
						// stackUp and stackDown, this will only be set once transitions
						// are made and not from init.
						// this is needed to allow JQM handleHashChange to take back over
						// once all panels are reset to base level
						$('html').data({'backAtBase':false});	

						// now that a panel transition was made, we need a lastStand blocker to ensure
						// jqm does not take over together with the last panel transition (when all stacks
						// are back at their original level, but only AFTER the last panel transition 
						// (when the lastStand has fallen...)
						// TODO: this was previously reset with every new wrapper-page being loaded into 
						// the DOM, not sure why, because it has to be a global tracker, since all 
						// panels need to be reset when a page is left
						$('html').data("lastStand", "standing");
																							
						// keep JQM history at initial level, keep it at inital level						
						self.unwindHistory();
						}
						
					
					//console.log("JQM history length="+$.mobile.urlHistory.stack.length);	
					
					//$.each($.mobile.urlHistory.stack, function(i, element) {
					//	console.log("history entry "+i+':' + element.url);					
					//	});						
					 
					// console.log( "at init"+self.options.$jqmHistoryStackAtInit );
					//  console.log("stackUp full "+$('div:jqmData(id="fullwidthPage")').data('stack') );
					// console.log("stackUp pop1 "+$('div:jqmData(id="log")').data('stack') );
					// console.log("stackUp pop2 "+$('div:jqmData(id="setup")').data('stack') );
			//		console.log("stackUp menu "+$('div:jqmData(panel="menu")').data('stack') );
				//	console.log("stackUp main "+$('div:jqmData(panel="main")').data('stack') );	
					//  console.log("ignoreNext= "+self.options.$ignoreMyOwnNextHashChange);
					//  console.log("crumbsBlockStackUp= "+self.options.$crumbsBlockStackUp);
					// console.log("backAtBase= "+$('html').data("backAtBase"));
					// console.log("lastStand= "+$('html').data("lastStand"));
					//  console.log("hashJoker= "+self.options.$hashJoker);
					//  console.log("contextBlockNextHashChange= "+self.options.$contextBlockNextHashChange);
					
			}, 
			
		// reduce panel history stacks
		stackDown: function ( source, event, data ) {
			// console.log("=====  panel DOWN, source= "+source+" =====DICKHEAD" );						 
			
			var self = this,
				getHash = $.mobile.path.parseUrl( data.toPage );
			
			if (getHash.hash) {
				var goTo = getHash.hash;
				} else {
					var goTo = '#'+getHash.href;
					}			
			
			var	$closestPanel = $( goTo ).closest('div:jqmData(role="panel")'),							
				$closestPanelID = $closestPanel.jqmData('panel'),
				$panels = $('div:jqmData(hash="history")'),
				longest = [],
				longestLen = 0;
				
			// console.log( "here isset="+$closestPanelID );
			
			if ( $closestPanelID == "menu" || $closestPanelID == "main") {
					// console.log("MAIN/MENU hashchange");
					$('div:jqmData(panel="main")').data('stack').pop();
					$('div:jqmData(panel="menu")').data('stack').pop();					
					} else {				
						// console.log("POPOVER hashchange");
						$closestPanel.data('stack').pop();					
						}
					
					// unwind 
					self.unwindHistory();					
					
					//earned a joker = one time pass through ignoreMyOwnNextHashChange				
					// self.options.$hashJoker = 1;
					
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
														
				//console.log("JQM history length="+$.mobile.urlHistory.stack.length);	
					
					//  $.each($.mobile.urlHistory.stack, function(i, element) {
					//	console.log("history entry "+i+':' + element.url);					
				//});											
				//	console.log( "at init"+self.options.$jqmHistoryStackAtInit );  				
				//	  console.log("stackDown full "+$('div:jqmData(id="fullwidthPage")').data('stack') );
				// console.log("stackDown pop1 "+$('div:jqmData(id="log")').data('stack') );
				// console.log("stackDown pop2 "+$('div:jqmData(id="setup")').data('stack') );
				// console.log("stackDown menu "+$('div:jqmData(panel="menu")').data('stack') );
				// console.log("stackDown main "+$('div:jqmData(panel="main")').data('stack') );
				//	  console.log("ignoreNext= "+self.options.$ignoreMyOwnNextHashChange);
				//	  console.log("crumbsBlockStackUp= "+self.options.$crumbsBlockStackUp);
				// console.log("backAtBase= "+$('html').data("backAtBase"));
				// console.log("lastStand= "+$('html').data("lastStand"));
				//	  console.log("hashJoker= "+self.options.$hashJoker);
				//	  console.log("contextBlockNextHashChange= "+self.options.$contextBlockNextHashChange);		
			
		},
		
		unwindHistory: function() {
			
			// make sure $.mobile.urlHistory stays at initial level
			var self = this,
				i  = $.mobile.urlHistory.stack.length;	
						
			while (i > self.options.$jqmHistoryStackAtInit) {
				i = i-1;
				$.mobile.urlHistory.stack.pop();	
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
			
		// panel transition handler - data is post-modified
		panelTrans: function (e, data) {							
					
			var	self = this,
				$link = self.options.$stageEvent,		
				
				// target - ok
				$targetPanelID = $( $link ).jqmData('panel'),					
				$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer,
				$targetPanelActivePage = $targetPanel.find( '.ui-page-active' ) || $targetPanel.find('div:jqmData(show="first")'),
				// current 
				$currPanel = $link ? $link.closest('div:jqmData(role="panel")') : data.options.fromPage.parents('div:jqmData(role="panel")'),
				$currPanelID = $currPanel.jqmData('id'),
				// activePage will be fromPage
				$currPanelActivePage = $currPanel.find( '.ui-page-active' ) || $currPanel.find('div:jqmData(show="first")');
									
				// make sure fromPage.data("page") does not return undefind
				$currPanelActivePage.page();
				
				// change options
				// data.options.fromPage = $('div:jqmData(wrapper="true")');
				data.options.fromPage = $currPanelActivePage;	

				data.options.pageContainer = $targetPanel;
				data.options.changeHash = $targetPanel.jqmData('hash') == 'history' ? true : false;										
								
				// set scrollTop blocker to keep popover panels visible when loading a new page into the DOM									
				if ( ( $targetPanel.jqmData("panel") || $currPanel.jqmData("panel") ) == "popover" ) {					
					self.options.$panelTransBlockScrollTop = true;
					}
					
				// clear stageEvent for next transition
				self.options.$stageEvent = '';
				
				// unblock for the next click event
				$('html').data({'clickInProgress':false })
				
				// set a flag for pushState passing along the url to load. 
				// if pushState is supported and a new page is loaded (isPath),
				// JQM will grab the URL (which should be xyz.html and append
				// it to the wrapper page vs. replacing the wrapper page and 
				// breaking back button/history along the way. This flag will
				// be reset with every panelTransition and reset inside the
				// pushStateHandler
				// used to be "url", now toPage
				$('html').data('pushStateFlag', data.toPage );
							
				// TODO: same as context, handler, create fakeEvent and fakeData
				var fakeEvent = {},
					fakeData = data;

				// assign fake attributes needed to add panel history entries
				fakeEvent.target = $targetPanel;																	
				
				// console.log( "vor stackup")
				// console.log( data )
				
				// block stack adding if it was a crumbs based (reverse) transition				
				// if ( self.options.$crumbsBlockStackUp == false) {				
					self.stackUp("panelTrans", fakeEvent, fakeData);						
					// }						
				
				// if set to true in order to block a crumbs backward transition
				// firing a stackUp event, reset to false, so next regular 
				// transition works again
				/*
				if ( self.options.$crumbsBlockStackUp == true ) {										
					self.options.$crumbsBlockStackUp = false
					}
				*/
				// call active class clearing				
				self.clearActiveClasses( "panelTrans", true, $(data.toPage), data.options.fromPage, $link );
								
				// set the Joker, to detect whether a panel transition fired
				// or not. In panelHash I can check for the joker.
				// if it's not set, panelTrans did not fire before,
				// so it would be a hashchange only transition and
				// then I can set $ignoreMyOwnNextHashChange accordingly
				// to allow subsequent hashChange (back button) transitions
				// to pass. 					
				// self.options.$hashJoker = 0;				
				
				// keep it false! 												
				// self.options.$ignoreMyOwnNextHashChange = false;									
				
				//make sure wrapper page stays activePage		
				$.mobile.activePage = $('div:jqmData(wrapper="true")');
								
				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body'); 
													
				// allow next pagebeforecreate to pass again
				// self.options.$infinity = ''; 			
		
		},
		
		// panel hashchange handler
		panelHash: function( e, data ) {
				
				// console.log("panelHash fired");				
				
				// remove panelHash again
				var self = this;														
				
				// stop Android for 500ms
				window.setTimeout(function () { self.options.$blockMultiClick = false; }, 500);												
				
				// check for history-panels
				$panels = $('div:jqmData(wrapper="true").ui-page-active div:jqmData(hash="history")'),
				n = $panels.length;
					
				// setup stack array
				longest = [],
				longestLen = 0;					
				
				// block hashChanges firing from regular JQM transition, 
				// when the plugin panel history is active, it keeps the
				// $.mobile.urlHistory.stack at length saved at init. 
				// Therefore a stack higher than 1 should not be possible 
				// on a wrapper. 
				// This is needed for dialogs. Check to see if it breaks something else!
				if ( $.mobile.urlHistory.stack.length > self.options.$jqmHistoryStackAtInit ) {	
					// console.log("block 4");
					return;
					}
								
				// this blocks hashChange calls set from panel-based transitions
				// otherwise the panelHash will fire two transitions! 	
				// $hashJoker enables more than one subsequent backward transitions			
				// $allowCrumbsHashToPass allows backwards transitions from crumbs buttons to pass					
				/*
				if ( self.options.$ignoreMyOwnNextHashChange == false  && self.options.$hashJoker == 0 && self.options.$allowCrumbsHashToPass != true ) {
					console.log("block 1");
					// self.options.$ignoreMyOwnNextHashChange = true;					
					self.options.$hashJoker = 1;					
					return;
					}
									
*/									
				/*
				if ( self.options.$ignoreMyOwnNextHashChange == false ) {
					console.log("block 1 - set to true, this blocks a hashchange!");
					self.options.$ignoreMyOwnNextHashChange = true;										
					return;
					}
				*/
				// first context hashChange is correctly blocked before, 
				// 2nd one passes and is stopped here				
				if ( self.options.$contextBlockNextHashChange == true ) {						
				// console.log("block 2");
					self.options.$contextBlockNextHashChange = false;
					self.options.$blockContextScrollTop = true;						
					return;
					}
			/*		
				// block pagination hashChanges				
				if ( self.options.$blockPaginationHashChange == true ) {					
				console.log("block 3");
					self.options.$blockPaginationHashChange = false;					
					return;
					}
			*/	
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

					
			// (1) TODO: remove longest.length/n, because it fails if main/menu at 2 = 2/2=1
			if ( n==1 || longest.length/n !== 1 || longestLen > 1 ) {  								
				// for example 4 stacks, height 2,2,2,4 > longest.length = 1 /n=4 = 0,25 = panelHistory							
				// (a) first check if a popover is active with a stack>1, this will be reduced first
				var activePop = $('.ui-panel-active.ui-popover');																	
				
				if ( activePop.length>0 && activePop.data("stack").length > 1 ) {								
					// console.log("active popover");
					var pickFromStack = activePop.data("stack"),
						gotoPage = pickFromStack[pickFromStack.length-2];															
					} else {						
						// console.log("active menu/main gotoPage = ");
						// (b) if all popovers are reset, check for highest fullwidth or main/menu panel								
						var gotoPage = self._mmHandler ( longest.length, longest, longestLen);	
						// console.log( gotoPage )
						} 
				
					// need to declare fromPage here, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
					//var fromPage = $( gotoPage ).closest('div:jqmData(role="panel")').find('.ui-page-active'),
					//	changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true, changeHash: true };													
					// $.mobile.changePage ( gotoPage, changePageOptions );							
					
				} else {							
					// this is a longshot for now: 
					// if a user goes back to the first page of the panel, the window.history will be @+1
					// which is the first page in the panel. The user can now click "close" (ok) or tap the
					// screen somewhere (ok). But... if the clicks the browser back button, this will reduce
					// the window.history by 1 and un-sync the history counter. So if the user really presses, 
					// he should end up here and then we should hideAllPanels? because this will also fire 
					// a browserReset thereby hiding any open popovers and re-syncing with window.history.
					// Not sure if this works all the way though, especially with menu/main panels. 													
					// window.history.back();	
					
					self.hideAllPanels("hashChange deadend #1");			
					return;
					}	
											
				// console.log("vorher");
				// console.log( data );
				
				
				var fromPage = $( gotoPage ).closest('div:jqmData(role="panel")').find('.ui-page-active');
				// enhance first page - should be done on init of wrapper page, otherwise on iPad this enhancement is too late on the first panel transition
				// fromPage.page();
				data.options.pageContainer = $( gotoPage ).closest('div:jqmData(role="panel")');
				data.options.fromPage = fromPage;
				data.options.changeHash = true;
				data.options.transition = "slide";				
				data.options.reverse = true;
				data.toPage = gotoPage;								
				
				// console.log("nachher");
											
				// as we have now made a transition, we need to block the next one coming from behind
				// same as in changePage handler															
				// self.options.$ignoreMyOwnNextHashChange = false;																
				
				// reset crumbs button pass
				// self.options.$allowCrumbsHashToPass = false;
				
				// unblock for the next click event
				$('html').data({'clickInProgress':false })
				
				// reduce panel stacks	
				// console.log("stackdown to= "+gotoPage );
				self.stackDown( "panelHash", e, data );
				
				// Clear active classes
				self.clearActiveClasses( "panelHash", true, $(gotoPage), fromPage );
				
				// not sure I need to set this.
				// $.mobile.firstPage[ 0 ] = gotoPage;	

				//make sure wrapper page stays activePage		
				$.mobile.activePage = $('div:jqmData(wrapper="true")');
				
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
				$triggerButton = $('div:jqmData(wrapper="true")').find('.toggle_popover:jqmData(panel="'+$deepPanelID+'")');																												
				}
						
			// make sure, first panel page is not enhanced, if deeplinking to a panel page other than 
			// data-show="first" page				
			if ($deepFrom.attr('id') != $deepPage.attr('id') ) { 								
				$deepFrom.removeClass('ui-page-active');
				}	
		
				
			// this needs a timeout, otherwise popovers will be closed
			// before opening by the last loading scrollTop (not sure, 
			// but deeplinked popovers won't open without a Timeout
			
				// show popover if there is one, but only if it's not visible already				
				if ($triggerButton && $deepPanel.attr('status') != 'visible' ) {
					$triggerButton.trigger('click'); 
					}
				
				// make sure, there is no trailing hashChange messing things up
				// self.options.$ignoreMyOwnNextHashChange = false;
								
				// load deeplink page
				$.mobile.changePage($deepPage, {fromPage:$deepFrom, transition:"slide", reverse:true, changeHash:false, pageContainer:$deepPanel});				
				
			
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
			if (howMany >= 2) {
				// console.log("two");
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
			
			
			// (b-3)[may want to keep] working selector for more than 3 panels with highest stack
			//if (howMany == 3) {
			//	var $last = [];
			//	for ( var i = 0; i < longest.length; i++) {							
			//		$last.push( longest[i][ longest[i].length - 1 ] );						  						  
			//		if ( $( $last[i] ).closest(':jqmData(role="panel")').jqmData('panel')  == "popover" ) { 
			//			var gotoPage = $last[i];
			//			}						  
			//		}
			//	return gotoPage;
			//	// need to reduce stacks!
			//	}
			
			},
		
		// manage click and vclck
		clickRouter: function( e, data, source) {																
				
			var self = this, link, $link;
		
			
			// make sure only one event passes
			if ( $('html').data('clickInProgress') == false ) {								
				$('html').data({'clickInProgress':true })

				// this returns crap if I programmatically trigger a click on another link element
				// instead of the actual clicked element, the previously clicked element is returned.
				// $( e.target ).closest('a')
				link = $( self.findClosestLink(e.target) );				
					
				if ( !link || e.which > 1) {
					return;
					}
				
				$link = $( link );
							
				if ( link.length === 1 && $(link).jqmData("panel") ) {											
					// store the click event/link element 						
					self.options.$stageEvent = $link;					
					}
					
				if ( link.length === 1 && link.jqmData('context') ) {
					// fire a second changePage
					self.context( link );					
					}	
				
				}
			},

		
		_mainEventBindings: function () {
	
			var self = this;						

			// history stack management with crumbs buttons active
            $(document).on('click', 'a.ui-crumbs', function (e) {				
				// console.log("crumbs click");
				// self.options.$allowCrumbsHashToPass = true; 				
				});
	
			// toggle popover
			$(document).on('click','a.toggle_popover', function(e) {				
				self.showPanel(e, $(this));
				});
						
			// panel context loading listener
			$(document).on("click", function( e, data ) {
				
				// block empty links - otherwise dead links set option clickInProgress to false
				// which is only un-set after pagechange or hashchange transitions...
				// TODO: find a better way to do this
				if ( $(e.target).attr('href') == "#" || $(e.target).attr('href') == "") {					
					return;
					}
								
				// as self.findclosestLink returns wrong element, only way to pass link is this... sucks
				self.clickRouter( e, data, "click");								
				});

			// click panel transition listener
			$(document).on("vclick", function( e, data ) {
				// need to bind to vclick, because binding to click = 300ms, so it not possible
				// to pass event data to options and retrieve them in panelTrans, because by
				// the time click fires, panelTrans has already run.
				// vclick however fires way before panelTrans, so this is used to store
				// click related information
				
				// same as above
				if ( $(e.target).attr('href') == "#" || $(e.target).attr('href') == "") {
					return;
					}
					
				// as above... sucks
				self.clickRouter( e, data, "vclick" );
				});
			
			// panel transition handler 
			$(document).on( "pagebeforechange", function( e, data ) {													
								
				var	$link = self.options.$stageEvent,		
					$targetPanelID = $( $link ).jqmData('panel'),					
					$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer;
				
				// console.log("pagebeforechange, checking for panel");
				// modify changePage options on panel transitions, either through link data-panel or changePage pageContainer option
				if ( $targetPanel != $.mobile.pageContainer && typeof data.toPage === "string" ) {								
			
					// this used to be inside panelTrans and panelHash, but on iOS this is too late to override any default
					// activeIndex JQM assigns. Also setting this in _setup function for the initial page
					// this is necessary, because otherwise on iOS3, active is undefinded when retrieving the panel-transition
					// maintain active history entry, should always be stack@init-1									
					// console.log( "init="+self.options.$jqmHistoryStackAtInit+" active="+$.mobile.urlHistory.activeIndex)
					$.mobile.urlHistory.activeIndex = self.options.$jqmHistoryStackAtInit;
					// console.log( "init="+self.options.$jqmHistoryStackAtInit+" active="+$.mobile.urlHistory.activeIndex)
								
					// stop if coming from a hashChange event
					if ( data.options.fromHashChange == true ) {				
						//console.log("pagebeforechange-HASH");
						// reroute to panelHash
						self.panelHash( e, data );	
						//return;
						} else {
						//console.log("pagebeforechange-TRANS");
							// reroute to panelTrans							
							self.panelTrans( e, data );
							}
		
					
					}
				});			
			
			// panel backwards transition listener
			$(window).on('hashchange', function(e) {				
				if ( self.options.$blockMultiClick == false ) {										
					self.options.$blockMultiClick = true;
					
					// same as button click handler - only set options here, panelHash will be fired from pagebeforechange!
					//self.options.$ignoreMyOwnNextHashChange = false;
					// self.options.$crumbsBlockStackUp = true;
				
					// self.panelHash( e, location.hash, location.pathname+""+location.hash );												
					}
				});					
			
							
			// make sure header is at css:top 0 when closing keyboard in iOS
			$(document).on("blur","div:jqmData(wrapper='true') input", function () {			
				$(".ui-header-fixed, .ui-element-fixed-top" ).css("top","0 !important");
				});	
	
			// consolidate unique elements across DOM and reset panel historys on inactive panels									
			$(document).on('pagebeforehide', 'div:jqmData(role="page").basePage', function(e, data) {
				
				// if we are going to a non-nested page (pull in a new page)
				if ( data.nextPage.closest('.ui-panel').length == 0 ) {
					
					// reset window.history to new level
					// console.log("reset $windowHistoryAtInit to "+window.history.length+" und JQM is@ "+self.options.$jqmHistoryStackAtInit+" stack@init="+self.options.$windowHistoryAtInit);
					// self.options.$windowHistoryAtInit = window.history.length
					self.options.$windowHistoryManualCounter == 0;
					
					// hide open panels on fromPage
					self.hideAllPanels("#wrapper-hide")
					
					// reset history on fromPage
					self.historyDump( $(this).find('.ui-popover') );										
					
					// reset laststand
					$('html').data("lastStand", "");										
				
					// consolidate unique elements				
					$(this).find(':jqmData(unique="true")').each(function(i){						
						
						var	uniqueID = $(this).jqmData("unique-id"),
							nextPage = data.nextPage,
							nextUnique = nextPage.find( ":jqmData(unique-id='"+uniqueID+"')" ),
							nextUniqueID = nextUnique.jqmData('unique-id') === uniqueID;
									
						// if toPage and fromPage have a unique element with 
						// identical uniqueID, the fromPage element will be 
						// appended to the toPage and removed from fromPage
						if ( nextUniqueID == true ) {							
							nextUnique.empty().append( $(this).html() );			
							$(this).empty();							
							}	
						
						});	   														
					}								
				})
		
			// listener for plugin setup on trigger wrapper-page and subsequent wrappers added 
			// to the DOM. This also sets up crumbify buttons
			// TODO: Think about separating...						
			$(document).on('pagebeforeshow', 'div:jqmData(role="page")', function(event, data){																	

				var page = $(this);					
					
				// if the page being shown is a nested page make sure history is unwound 
				// needed, because back-btn adds an entry to the jqm history stack, which
				// can't be removed from inside stackup/stackdown. This ensures, that
				// browser back-button and crumbs back button work together.				
				if ( page.parents('div:jqmData(wrapper="true")').length > 0 ) {					
					self.unwindHistory();
					}

				// if pageshow is for a wrapper-page, setup the plugin
				if ( page.jqmData('wrapper') == true ) {	
					
					// make sure visible panels have an active first-page on backwards transitions
					if ( page.find('.ui-panel[status="visible"] .ui-page-active').length == 0 ) { 
						page.find('div:jqmData(show="first")').addClass('ui-page-active');
						}
					
					// if it's a deeplink page, fire panelDeeplink
					if ( $('html').data("multiviewDeeplink") && page.find( $('html').data("multiviewDeeplink")+"" ).length >= 1  ) {																								
						self.panelDeepLink();
						}
					
					// the setup for wrappers should only run once, which is
					if ( page.data("counter") == 0 || typeof page.data("counter") == 'undefined') {							
											
						self.setupMultiview(event, page);
						
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
						page.data("counter", 0+inc);						
						} else {
							// wrapper already is in the DOM, just update the layout	
							self.checkWidth();						
							}
					// the crumbs part	
					// as it's a wrapper page we don't need crumble buttons on it, so stop here
					event.preventDefault();					
					} else if ( page.closest('div:jqmData(role="panel")').jqmData('hash') && page.jqmData("show") != "first" ){	

						// fires crumble every time a page is created
						// by checking for a closest panel, we ensure it's not fired on a regular JQM page!	
						// need to delay this, otherwise this runs before the history stacks are updated, 10ms seems enough						
						window.setTimeout(function() {								
							self.crumble(event, data, page );	
							}, 50);
						} 
				});

			// fire splitviewCheck on orientationchange (and resize)
			$(window).on('orientationchange', function(event){					
				self.splitScreen(event);					
				self.checkWidth();
				self.panelHeight();
				self.gulliver();
				});																						
			
			}
		
	});
	
// plugin flag
$('html').data("lockup","unlocked");

// initialize single DOM instance of multiview with first wrapper page
var trigger = $(document).on('pagecreate', 'div:jqmData(wrapper="true")',function(event){ 	
		
	if ($('html').data("lockup") == "unlocked") {		
		// initialize a counter to avoid setup of plugin firing with every pageshow
		$( this ).data("counter",0);		
		$( this ).multiview();
		$('html').data("lockup","locked");
	}
});

}) (jQuery,this);