 /**
 * jQuery Mobile Framework : "multiview" plugin
 * @author Sven Franck <sven.franck@stokkers.de>
 * @copyright 2012 Sven Franck <sven.franck@stokkers.de>
 * @license Dual licensed under the MIT or GPL Version 2 licenses.
 */
		
(function( $, window) {	
	
	$.widget("mobile.multiview",$.mobile.widget, {
		
		options: {			
			
			/**
			  * self.options
		      * Configurable options
		      */			
			
			/**
			  * self.option.lowerThresh|upperThresh
		      * threshold screen widths
			  * 0px - 320px 	= "small"	fullscreen-mode
			  * 320px - 768px	= "medium"	popover-mode, yield-mode or offset-mode
			  * 768px - 		= "large"	splitview-mode
		      */		
			$lowerThresh: 320,						
			$upperThresh: 768, 			
			
			/**
			  * self.options.switchable|switchableHideOnLoad
		      * popover buttons for menu/mid panel will be visible in splitview mode, can be used to toggle hide/show panels
		      */			
			switchable: false,			
			switchableHideOnLoad: false,
			
			/**
			  * self.option.menuTxt|menuBtnTheme|menuBtnIcon|menuBtnIconPos
		      * configure menu button, can be set here or on the panel using data-menuTxt="some_text"
		      */			
			menuTxt: 'Menu',
			menuBtnTheme: 'a',
			menuBtnIcon: 'gear',
			menuBtnIconPos: 'left',
			
			/**
			  * self.option.midTxt|midBtnTheme|midBtnIcon|midBtnIconPos
		      * configure mid button, same as above
		      */
			midTxt: 'Mid',
			midBtnTheme: 'a',
			midBtnIcon: 'gear',
			midBtnIconPos: 'left',		
			
			/**
			  * self.option.menuWidth|menuMinWidth
		      * configure width of menu panel, can also be set on the panel using data-menuWidth="xy%"
		      */
			menuWidth: '25%',
			menuMinWidth: '250px',
			
			/**
			  * self.option.midWidth|midMinWidth
		      * configure width of mid panel, same as above
		      */
			midWidth: '25%',
			midMinWidth: '250px',
			
			/**
			  * self.option.externalSiteMap
		      * <<not used>>, should be queried on deeplinks in case a deeplink goes to a nested page
			  * which is not in the multiview page on inital page load.
			  * For example:
			  * some.html
			  * Panel A = #page1, #page2
			  * Panel B = #page3, #page4 - pageABC.html can be loaded in externally
			  * > deeplink to some.html#pageABC will produce an error
			  * by using the sitemap object, it can be specified where to load extenal deeplinked pages
		      */			
			externalSiteMap: [ ["#id", "url", "panel"] ],
			
			/**
			  * self.options
		      * Fixed options
		      */
			
			/**
			  * self.options.$blockMultiPbc
		      * block multiple pagebeforechange firing on backwards transitions
		      */			
			$blockMultiPbc: false,
			
			/**
			  * self.options.$allowCrumbsHashToPass
		      * allow crumbs induced backwards transitions to pass hashchange blockers
			  * NECESSARY?
		      */			
			$allowCrumbsHashToPass:false,
			
			/**
			  * self.options.$stageEvent
		      * store click events, so they are available for overriding changepage options
		      */			
			$stageEvent: '',
					
			/**
			  * self.options.$panelTransBlockScrollTop
		      * block scrollTop on transitions inside a popover
		      */			  
			$panelTransBlockScrollTop:'',
							
			/**
			  * self.options.$contextBlockNextHashChange
		      * block 2nd hashchange on context transitions
			  * NECESSARY?
		      */
			$contextBlockNextHashChange:'',
			
			/**
			  * self.options.$blockContextScrollTop
		      * block popover panel closing on a context transition			  
		      */			
			$blockContextScrollTop:'',
			
			/**
			  * self.options.$blockMultiClick
		      * prevent multiple clicks firing messing up things on Android
		      */			
			$blockMultiClick: false,
			
			/**
			  * self.options.$crumbsID
		      * crumbs pageID placeholder - uses the 300ms vclick to store the href of the clicked button			  
		      */			
			$crumbsID: '',
			
			/**
			  * self.options.$crumbsPanel
		      * crumbs pagePanel placeholder - uses the 300ms vclick to store the panel of the href of the clicked button
		      */			
			$crumbsPanel: '',
			
			/**
			  * self.options.$transDelta
		      * counter for capturing the second-to-last backwards transition
			  * FIND BETTER WAY
		      */			
			$transDelta: 0,
			
			/**
			  * self.options.$pbcCoutner
		      * counter to allow only the first transition event to pass into second-to-last capture
			  * FIND BETTER WAY
		      */
			$pbcCoutner: 0,
			
			/**
			  * self.options.$clickInProgress
		      * flag to block multiple clicks being triggered
		      */
			$clickInProgress: false,
			
			/**
			  * self.options.$calcInProgress
		      * flag to block multiple calculations being triggered by multiple page events
		      */
			$calcInProgress: false,  
			
			
		},

/** -------------------------------------- PLUGIN SETUP -------------------------------------- **/		

		 /**
		   * name: 	      	_create		   
		   * called from: 	plugin trigger = any JQM page with data-wrapper="true" specified
		   * purpose: 		add classes to <html> and setup all event bindings
		   */	
		_create: function() {		
			
			var self = this,
				touchy = $.support.touch ? ' touch ' : ' notouch ',
				pushy = history.pushState ? ' pushstate ' : ' nopush ',
				blkLst = $.mobile.fixedtoolbar.prototype.options.supportBlacklist() && $.support.scrollTop ? ' blacklist ' : '',
				overThrow = $('div:jqmData(scrollmode="overthrow")').length > 0 ? ' overthrow-mode ' : '',
				base = 'multiview ui-plain-mode'+touchy+pushy+blkLst+overThrow;
						
			$('html').addClass( base );
											
			self._popoverBindings();
			self._mainEventBindings();
			
		},
		
		 /**
		   * name: 	      	setupMultiview
		   * called from: 	main event bindings, pagebeforeshow.wrapper
		   * purpose: 		called once for every wrapper page (init or pulled-in),
		   *                sets default flags, global toolbars, enhances first pages on all panels, sets up popovers and splitview
		   * @param {event} event
		   * @param {page}	object
		   */	
		setupMultiview: function(event, page) {		
			
			var self = this, header;
			
			page																				
				.addClass( $.mobile.activePageClass )
				
				.find("div:jqmData(role='panel')").addClass('ui-mobile-viewport ui-panel').end()			
								
				// flag popovers for enhancement
				.find("div:jqmData(panel='popover')").addClass("popEnhance").attr({'set':'off'}).end()
				
				// flag menu-popover for enhancement in popover mode
				.closest('html.ui-popover-mode').find('div:jqmData(panel="menu")').addClass("popEnhance").attr({'set':'off'}).end()								
				
				// assign data-url by hand for wrapper-pages pulled in externally
				// TODO: remove if not needed
				.filter('div:jqmData(external="true")').find('div:jqmData(role="page")').each(function() {			
					$(this).attr('data-url', $(this).attr('id') );
					}).end()
							
				.find('div:jqmData(role="panel") div:jqmData(show="first")').addClass( $.mobile.activePageClass );

				// need to call page, otherwise fromPage.data("page") is undefined on first panel transition
				page.find('div:jqmData(role="panel") div:jqmData(show="first")').each( function() {				
					$(this).page();
					});

				// prevent dropping panel pages after transition						
				page.find("div:jqmData(role='page')").attr('data-internal-page', 'true');
				
				// pre-set fullscreen mode here, otherwise missing fullscreen class, which causes ui-panel-hidden to not be assigned in fullscreen mode
				// which confuses toggle_popover buttons - this class will be reset in Gulliver
				if ( self.framer() == "small" ) {					
					$('html').addClass('ui-fullscreen-mode');
					}
						
			// if menu/mid/main panel
			if ( page.find('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="mid")').length > 0 ) {												
				
				// global header/footer classes and padding
				page.children('div:jqmData(role="header"), div:jqmData(role="footer")').each( function() {
					header = $(this).is( ".ui-header" );
					$(this).addClass( header ? 'ui-header-global' : 'ui-footer-global' )
							.attr( "data-position", page.jqmData("scrollmode") == "overthrow" ? "inline" : "fixed" );
					});
					
				// fire splitScreen	
				self.splitScreen("init");
				}	
							
			// init popovers
			self._setupPopovers( page );
			// init make-up
			self.gulliver();
			// init panelHeight handler
			self.panelHeight();
				
			},

/** -------------------------------------- POPOVER HANDLER -------------------------------------- **/
		 
		 /**
		   * name: 	      	_setupPopovers
		   * called from: 	setupMultiview - fires once for every wrapper page
		   * purpose: 		add triangles, handle autoshow (= show popover once, the first time the page loads)
		   * @param {page}	object
		   */			
		_setupPopovers: function( page ) {
						
			page.find(".popEnhance").each(function(i) {		
				
				var pop = $(this);

				if ( pop.attr('set') == 'off' ) {
										
					pop
						.jqmData('set','ok')
						
						.removeClass( "popEnhance" )
						
						.addClass("ui-triangle-"+pop.jqmData("triangle") )
						
						.filter( ".ui-triangle-top").append('<div class="popover_triangle" />').end()
						
						.filter( ".ui-triangle-bottom" ).prepend('<div class="popover_triangle" />').end();
					
					// autoshow
					if ( pop.jqmData("autoshow") == "once") {							
						
						window.setTimeout(function() {										
							page.find(".toggle_popover:jqmData(panel='"+pop.jqmData('id')+"'):eq(0)").click();
							},10);
						
						// remove
						pop.jqmRemoveData("autoshow").removeAttr('data-autoshow');
						}													
					}
				});
			
		},
			
		/**
		   * name: 	      	_popoverBindings
		   * called from: 	_create, will only be called once
		   * purpose: 		when to close a popover = call hideAllPanels()
		   *				(1) close popover button
		   *				(2) scrollstart on panel (overthrow mode)
		   *				(3) scrollstart document
		   *				(4) click or tap on the wrapper page
		   *				(5) changePage on background = main/menu/mid panel (splitview-mode) or main (popover-mode)
		   *				(6) click a link in a panel, which loads a page in another panel (fullscreen mode)
		   *				[(7) orientationchange - break deeplinks, no idea why]
		   *				[(8) clicking on active popover button closes this popover - inside showPanel()]
		   *				[(9) clicking on a not-active trigger button closes all other popovers first - inside showPanel() ]
		   * IMPROVE SELECTORS...
		   */
		_popoverBindings: function() {
				
			var self = this, solo = false, $nope, $midMen;
				
			
			// (1) 
			$(document).on('click','a.closePanel', function () {				
				self.hideAllPanels("#1");
				});
			
			// (2)
			if ( $('html').hasClass('overthrow-mode') ) {				
				
				// this is hard to get to work with overthrow. just does not fire a lot.
				$('.ui-content').on('scrollstart', function() {
											
					if ( $('html').hasClass('ui-splitview-mode') && $(this).closest('div:jqmData(panel="main"), div:jqmData(panel="mid"), div:jqmData(panel="menu")').length > 0 ||
							$('html').hasClass('ui-popover-mode') && $(this).closest('div:jqmData(panel="main")').length > 0 ) {
								
								// prevent iOS keyboard hiding popover				
								if ( !$("input:focus").length > 0  ) {					
									self.hideAllPanels("#2");
									}
						}					
					});
				}
				
			// (3)
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
			
			
			// (4) 
			$(document).on('click tap', function(event) {	
				
				$midMen = $('div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$nope = $('div:jqmData(panel="popover"), .mmToggle, .toggle_popover').add( $('.ui-fullscreen-mode').find( $midMen ) ).add( $('.ui-popover-mode').find( $midMen ) );
								
				// don't hide if click is on popover and popover-toggle button
				// or the menu or mid in popover mode
				// or any custom select menus firing up... this list is getting to long.				
				if ( $(event.target).closest( $nope ).length > 0 ) {											
					return; 
					}
					
				// make sure it only fires once			
				if ( solo == false ) {					
					solo = true;
					self.hideAllPanels("#4");
					window.setTimeout(function() { solo = false; },500);
					}
				
			});
			
			// (5) 
			$(document).on('pagebeforehide', '.ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="main") div.ui-page-active, .ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="menu") div.ui-page-active, .ui-splitview-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="mid") div.ui-page-active, .ui-popover-mode div:jqmData(wrapper="true").ui-page-active div:jqmData(panel="main") div.ui-page-active' ,function(event) {
														
				// not if this is because of a context transition							
				if ( self.options.$contextBlockNextHashChange == false) {					
					self.hideAllPanels("#5");
					}
				});
		
		
			// (6) 
			// in fullscreen mode to close a page on panel A when loading a page in panel B
			$(document).on('click','div:jqmData(role="panel") a', function () {												
				if ( $('html').hasClass('ui-fullscreen-mode') && $(this).jqmData('panel') != $(this).closest('div:jqmData(role="panel")').jqmData('id') ){																												
					self.hideAllPanels("#6");
					}

				});
				
			// (7) 			
			// $(window).on('orientationchange', function(event){ 
			// 		self.hideAllPanels("#7");
			// 		}); 
			
			
			},
			
		/**
		   * name: 	      	hideAllPanels
		   * called from: 	all of the above
		   * purpose: 		close popovers = regular popover or a menu/mid panel in popover or fullscreen mode
		   * @param {string}to check who called
		   */
		hideAllPanels: function(from) {
		
			var self = this, $pop; 
					
			$('.toggle_popover').removeClass('ui-btn-active');
			
			// loop
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu'), .ui-popover-mode div:jqmData(panel='mid'), .ui-fullscreen-mode div:jqmData(panel='menu'), .ui-fullscreen-mode div:jqmData(panel='mid')").each(function(index) {
				
				var $pop = $(this);
				
				if( $pop.is(':visible') ) {
					
					$pop.addClass('reverse out')
						.hide('fast')	
						.removeClass('ui-panel-active')								
							.find(".ui-page-active")
								.not("div:jqmData(show='first')")
								.removeClass('ui-page-active').end()
							.find(".ui-btn-active")
								.removeClass('ui-btn-active');
			
					// fullscreen handler
					if ( $('html').hasClass('ui-fullscreen-mode') ) {
						
						//reactivate background panels/pages and reset background page height
						$('.ui-panel-hidden').removeClass('ui-panel-hidden');
						$('.reActivate').addClass('ui-page-active').removeClass('reActivate');
						self.backgroundPageHeight( '', "clear" )
						}								
							
					// drop pages pulled into the panel from DOM	
					$pop.find('div:jqmData(external-page="true")').remove();
								
					// clean up after Android bleed through clicks
					$('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');
					
					} else {
						// make sure popover is not visible
						$pop.css('display','none');
					}
				
				});
				
				// clean up - transition depends on yield-mode or not 
				window.setTimeout( function() {						
					$('div:jqmData(role="panel")').removeClass('reverse out '+ 
									( $('div:jqmData(yieldmode="true")').length > 0 
										&& !$('html').hasClass('ui-splitview-mode') ) ? 'slide' : 'pop');
																					
					// reset
					self.options.$clickInProgress = false;
					}, 350);

		
			},
		
		/**
		   * name: 	      	hideAllPanels
		   * called from: 	clicking a toggle_popover button or from data-autoshow
		   * purpose: 		show a popover or switchable panel
		   * @param {event}	click event
		   * @param {object}clicked button
		   */
		showPanel: function(e, $el) {				
			
			var self = this,
				$correspond = $el.jqmData("panel"),
				$popPanel = $('div:jqmData(id="'+$correspond+'")'),
				$wrap = $popPanel.closest('div:jqmData(wrapper="true")'),
				activePage, firstPage, refPage;
			
			if ( $popPanel.is(":visible") ) {
				
				if ( $popPanel.hasClass('switchable') && $wrap.jqmData('switchable') ) {
					
					// hide switchable
					$popPanel.css('display','none').addClass("switched-hide");					
					self.panelWidth( true, "showPanel1");
					
					} else {						
						// (8) regular panel routine
						self.hideAllPanels("#8");
						}
					
				} else {

					if ( $popPanel.hasClass('switchable') && $wrap.jqmData('switchable') ) {
						
						// show switchable
						$popPanel.css('display','block').removeClass("switched-hide");						
						self.panelWidth( true, "showpanel2");
						
						} else {								

							// (9) regular panel routine
							self.hideAllPanels("#9");
							
							// center screen
							if ( $popPanel.hasClass('ui-popover-center') ){							
								$popPanel.css("left", (($(window).width() - $popPanel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
								}													
							
							// reposition 
							// done with Scott Jehls - https://github.com/filamentgroup/jQuery-Mobile-FixedToolbar-Legacy-Polyfill
							$popPanel.jqmData("fixed") == "top" ? 
								$popPanel.css( "top", $( window ).scrollTop() + "px" ) :
									$popPanel.css( "bottom", $wrap.outerHeight() - $( window ).scrollTop() - $.mobile.getScreenHeight() + "px" );
							
							// show
							$popPanel.not('.ui-splitview-mode div:jqmData(panel="menu"), .ui-splitview-mode div:jqmData(panel="mid")')
								.addClass('ui-panel-active '+ ( $('div:jqmData(yieldmode="true")').length > 0 && !$('html').hasClass('ui-splitview-mode') ) ? 'slide ' : 'pop '+' in')
									.show('fast')										
										.find('div:jqmData(show="first")')
											.addClass('ui-page-active');
							
							// clean up
							window.setTimeout( function() {									
								$popPanel.removeClass('in');
								
								// reset
								self.options.$clickInProgress = false;								
								}, 350);
								
							// fullscreen handler	
							if ( $('html').hasClass('ui-fullscreen-mode') ) {							
								
								// hide background panel, so popover does not drop below it							
								$('div:jqmData(panel="main").ui-panel-active').addClass('ui-panel-hidden');
								
								//remove all other active pages to make sure popover is visible 	
								//assign a reActivate flag to activate pages again once this panel hides
								$('.ui-page-active')
									.not( "div:jqmData(wrapper='true'), div:jqmData(id='"+$correspond+"') .ui-page-active" )
										.addClass("reActivate")
											.removeClass('ui-page-active')																		
										
								// "fix" for Android bleeding through clicks... requires to disable background page buttons and 
								// inputs/selects while navigating overlay pages, otherwise click goes through to background page
								// http://code.google.com/p/android/issues/detail?id=6721								
								$('.ui-page').not( $popPanel.find('div:jqmData(role="page")') ).each( function() {									
									$(this).find(".ui-header").first().find(".ui-btn, input, select, textarea").addClass('ui-disabled androidSucks').attr('disabled','disabled')									
									});
								
								// and since Android never minds and also disables the page that should be enabled
								$popPanel.find('.androidSucks').removeClass('ui-disabled androidSucks').removeAttr('disabled');
																						
								// get active or data-show first page on the panel
								activePage = $popPanel.find('.ui-page-active');
								firstPage = $popPanel.find('div:jqmData(show="first")');
								refPage = activePage.length > 0 ? activePage : firstPage;
									
								// tweak background page height	to enable hardware-scrolling by setting height of all pages to height of active popover
								self.backgroundPageHeight( refPage, "set" )
								}

							$el.addClass('ui-btn-active');
							}				
					}
	
			},

/** -------------------------------------- BACK/MENU BUTTON HANDLER -------------------------------------- **/
		
		 /**
		   * name: 	      	 crumble
		   * called from: 	 pagebeforeshow on panel pages (not wrapper page!)
		   * purpose: 		 creates a backbutton, passes it to popoverBtn() function
		   * @param {event}	 event = pagebeforeshow
		   * @param {object} data = event data
		   * @param {object} page = being shown
		   */				
		crumble: function(event, data, page) {			

			var self = this, 
				onPage = $( '#'+page.attr('id') ),
				$dropZone = onPage.find('div:jqmData(role="header")') || 
								onPage.closest('div:jqmData(wrapper="true").ui-page-active').children('div:jqmData(role="header")'),				
				$prevPage = $( data.prevPage ), 
				$prevPageID = data.prevPage.attr('id'),				
				$prevHead = $prevPage.find('.ui-header'),
				$prevText; 
			
			if ( onPage.jqmData("show") != "first")  {										
								
				$prevText = $prevHead.find('.ui-title').text() || $prevPageID;
					
					// the panel MUST be the panel the new page is on
					$prevPanelID = $prevPage.closest('div:jqmData(role="panel")').jqmData("id"),
					// theme must be from current page!
					$currTheme = onPage.find( ".ui-header" ).jqmData('theme') || "a",
					
					newButton = $( "<a href='"+$prevPageID+"' class='ui-crumbs iconposSwitcher-a' title='back' data-rel='back' data-panel='"+$prevPanelID+"'>"+$prevText+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: true,
									theme: $currTheme,
									iconpos: "left",
									icon: 'arrow-l'
									});
					// handover
					self.setBtns("add", $dropZone, newButton );
				}
		
			}, 				
		/**
			* function name 
			* description
			* @param {event} ...
			* @param {page} ...
			* @return {} ...
			*/			
		popoverBtn: function ( buttonType ) {
			
			// --- PURPOSE ---		
			// 1. Add the popover button(s). In case there is two panels, it will be one button to toggle the menu/mid panel. In case there are
			//    3 panels, this will be a controlgroup, to toggle either the menu or mid panel. In yield-mode, one option to switch between 
			//    panels are the popoverBtn, which no don't pop up the respective panel, but slide it in like another page... at least this is the plan.
			//    Alternatively panels out of view can be dragged. 
			
			// --- CALLED FROM ---
			// 1. popover() - in case it's a plain popover button
			// 2. splitscreen() - in case it's a switchable button to toggle menu/mid
			// 3. yield() - in case it's a yield button to slide in/out panels, which are out of view
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	added yield functionality, added mid-panel support	
			//              
			
			// --- TODO ---			
			// - Yield Mode Popover Button functionality
			// - create buttons/controlgroup dynamically
			// - how to manage space on small screens with 4-btn-controlgroups (BACK/HOME/Toggle Menu/Toggle Mid)
			// - fix controlgroup merging (c)
			
			var self = this,									
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),			
				$mdBt = '',
				$mnBt = '',				
				
				$globalHeader = $wrap.find('.ui-header-global'),
				$localHeader = $wrap.find('div:jqmData(panel="main") div:jqmData(role="page") .ui-header'),
				$flexPos = $wrap.find('div:jqmData(role="page") div:jqmData(drop-pop="true")'),
				
				// drop popover button whichever is found (in this order!) (1) user-specified location (2) global header (3) local headerS (4) pageS content				
				$dropZone = $flexPos.length ? 
					$flexPos : $globalHeader.length ? 
						$globalHeader : $localHeader.length ? 
							$localHeader : $wrap.find('div:jqmData(panel="main") .ui-content');
										
				// menu
				if ( $menu ) {					
					var $mnId = $wrap.find('div:jqmData(panel="menu")').jqmData('id'),
						$mnIc = $menu.jqmData('menu-icon') || self.options.menuBtnIcon,	
						$mnIp = $menu.jqmData('menu-iconpos') || self.options.menuBtnIconPos,
						$mnTh = $menu.jqmData('menu-theme') || self.options.menuBtnTheme,
						$mnTx = $menu.jqmData('menu-text') || self.options.menuTxt,
						// this is a button without corners and controlgroup classes, so it can be moved around in controlgroups... :-)
						// TODO: find a way to create this button dynamically - this does not work... 						
						/*
						$mnBt = $("<a href='#' data-inline='true' class='ui-crumbs popover-btn iconposSwitcher-a toggle_popover popToggle' title='back' data-panel='"+$mnId+"'>"+$mnTx+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: false,
									theme: $mnTh,
									iconpos: $mnIp,
									icon: $mnIc
									});
						*/			
						$mnBt = $('<a data-iconpos="'+$mnIp+'" data-icon="'+$mnIc+'" data-role="button" href="#" data-panel="'+$mnId+'" data-theme="'+$mnTh+'" class="ui-btn-up-'+$mnTh+' ui-btn ui-btn-icon-'+$mnIp+' ui-shadow  iconposSwitcher-a toggle_popover mmToggle menuToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mnTx+'</span><span class="ui-icon ui-icon-'+$mnIc+' ui-icon-shadow">&nbsp;</span></span></a>');
					}
					
				// mid
				if ( $mid ) {					
					var $mdId = $wrap.find('div:jqmData(panel="mid")').jqmData('id'),
						$mdIc = $mid.jqmData('mid-icon') || self.options.midBtnIcon,	
						$mdIp = $mid.jqmData('mid-iconpos') || self.options.midBtnIconPos,
						$mdTh = $mid.jqmData('mid-theme') || self.options.midBtnTheme,
						$mdTx = $mid.jqmData('mid-text') || self.options.midTxt,
						// as above - JQM does not work...
						/*$mnBt = $("<a href='#' data-inline='true' class='ui-crumbs popover-btn iconposSwitcher-a toggle_popover popToggle' title='back' data-panel='"+$mdId+"'>"+$mdTx+"</a>" ).buttonMarkup({										
									shadow: true,	
									corners: false,
									theme: $mdTh,
									iconpos: $mdIp,
									icon: $mdIc
									});
						*/
						$mdBt = $('<a data-iconpos="'+$mdIp+'" data-icon="'+$mdIc+'" data-role="button" href="#" data-panel="'+$mdId+'" data-theme="'+$mdTh+'" class="ui-btn-up-'+$mdTh+' ui-btn ui-btn-icon-'+$mdIp+' ui-shadow  iconposSwitcher-a toggle_popover mmToggle midToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mdTx+'</span><span class="ui-icon ui-icon-'+$mdIc+' ui-icon-shadow">&nbsp;</span></span></a>');
					}
					
				$buttons = $mnBt.add( $mdBt );

			// add switchable classes			
			if (buttonType == "switchable") {
				$menu.add( $mid ).addClass('switchable');
				}
			
			// insert Buttons into dropZone
			self.setBtns( "add", $dropZone, $buttons );

			},

		setBtns: function ( action, $dropZone, $elements ) {
			
			// --- PURPOSE ---		
			// 1. 	inserts buttons into header or other element specified. Function checks what is there and create appropriate containers
			//      so buttons to be inserted are merged with whatever is there. Function also skins existing buttons (remove corners), and
			//      adds new corners/classes to the merged controlgroup. On small screens, button texts are dropped as there can be 3+ buttons
			//      on the left.
			
			// --- CALLED FROM ---
			// 1.   popoverBtn: insert popover menu toggles			
			// 2.   crumble: insert panel back buttons
						
			// --- UPDATES ---
			// JQM 1.1 RC2: merged the above three functions' rountine into this function
			//              
			
			// --- TODO ---
			// -  make sure this works with leftWrapper with select NOT controlgroup
			// -  clean code
			
			var self = this, 				
				$crns = 'ui-btn-corner-all ui-btn-corner-right',				
				$button, $first, $prevBtn, $newBtn, $lftWrp, $buttons, $ctrlGrp, $this, $clear, $filter;
							
			// only do something if not just updating corners
			if ( action != "update" ) {
				
				$dropZone.each(function() {
					
					$this = $(this),  
					$lftWrp = $('<div />').addClass("headWrapLeft ui-btn-left"),		
					$ctrlGrp = $('<div />').attr({'data-role':'controlgroup', 'data-type':'horizontal'}).addClass('btnSwitchBoard').controlgroup(), 					
					$buttons = $elements.clone();
					
					// (a) empty dropZone => create wrap and controlgroup, insert button(s)				
					if ( $this.find('.ui-btn-left').length == 0 && $this.find('.btnSwitchBoard').length == 0  ) {
						
						if ( $this.is( ".ui-header" ) ) {							
							// insert in header
							$this.prepend( $lftWrp.html( $ctrlGrp.html( $buttons ) ) );
							} else {
								// insert in content, user specified element - no need for header wrapper
								$this.prepend( $ctrlGrp.html( $buttons ) );
								}
														
					} else {
						
						// (b) there is something left - this should grab all headers					
						if ( $this.find('.ui-btn-left.ui-btn').length ) {
							
							// (b1) a button = edge case, since plugin always should add wrapper and controlgroup and place buttons inside
							$button = $this.find('.ui-btn-left.ui-btn');
							
							// "skin" button and replace with toggle controlgroup
							$button.removeClass( $crns+' ui-shadow popover-btn' )
									.find('.ui-btn-inner').removeClass( $crns ).end()
									.css({'position':'static'})
									.addClass('ui-controlgroup-btn-left ui-btn-inline iconposSwitcher-a')
							
							$this.find( $button ).remove();
							
							if ( $this.is( ".ui-header" ) ) {																
								$this.prepend( $lftWrp.html( $ctrlGrp.html( $button.add( $buttons ) ) ) );
								} else {
									$this.prepend( $ctrlGrp.html( $button.add( $buttons ) ) );
									}
							
							} else {
								
								// (b2) something else, either a wrapper inside a header or a controlgroup inside a user specified element
								$first = $this.find('.ui-btn-left').children(':first');
								
								if ( $first.hasClass('ui-controlgroup') ) {
									
									// clean corners
									$first.addClass('btnSwitchBoard').find( '.ui-controlgroup-last').removeClass('ui-controlgroup-last ui-corner-all ui-corner-right')
											.find('.ui-btn-inner').removeClass('ui-corner-all ui-corner-right');
									
									function clearOut( $what ) {									
										$buttons.each(function () {
											if ($(this).is( $what )) {
												$buttons = $buttons.not( $what )													
												}
											});
										}
																		
									// filter for existing buttons
									// TODO: improve
									if ( $first.find('.midToggle').length > 0 ) {										
										clearOut('.midToggle');
										}
									if ( $first.find('.menuToggle').length > 0 ) {										
										clearOut('.menuToggle');
										}
									if ( $first.find('.ui-crumbs').length > 0 ) {
										 clearOut('.ui-crumbs');
										}
									
									$first.append( $buttons ) 
									} else {
										
										// edge case: not a controlgroup, perhaps select element or ? 										
										$first.find( '.ui-btn' ).removeClass('ui-btn-corner-all')
													.find( '.ui-btn-inner').removeClass('ui-btn-corner-all');
										$first.remove();
										$this.find('.headWrapLeft').prepend( $ctrlGrp.html( $first.add( $buttons ) ) );
										}
								}
					
						}
					});
				}
			
								
			// add corners to first and last element
			$('.btnSwitchBoard').each( function () {				
				$(this).find('.ui-btn').first().addClass('ui-corner-left')
						.find('.ui-btn-inner').addClass('ui-corner-left');
				$(this).find('.ui-btn').last().addClass('ui-corner-right ui-controlgroup-last')
						.find('.ui-btn-inner').addClass('ui-corner-right');
				});
							
			},
		
/* -------------------------------------- SCREEN MODE HANDLER -------------------------------------- */
	
		popover: function (e) {
			
			// --- PURPOSE ---		
			// 1. set up popover mode
			
			// --- CALLED FROM ---
			// 1. splitScreen() - depending on screen size and orientation			
						
			// --- UPDATES ---
			// JQM 1.1 RC2: added third panel support, yield mode						
			
			// --- TODO ---			
			// - data-yield-to="none" to allow users to specifiy, which panel to start from. Also need to add toggle buttons to all panels in this case!
			// beware of panelWidth if feeding other events like "resize" into here. panelWidth() call needs to be adjusted
			
			var self = this,				
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),
				$popover = $wrap.find('div:jqmData(panel="popover")'),
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$popClasses = 'ui-popover pop_menuBox ui-panel-active ui-triangle-top',
				// removed ui-fixed-element-faux-top/bottom	
				$yield = $('div:jqmData(yieldmode="true")');
				
				$('html').addClass('ui-multiview-active ui-popover-mode').removeClass('ui-splitview-mode');
								
			// race condition	
			if( !$('html').hasClass('ui-fullscreen-mode') && $yield.length == 0 ) {
				
				$menu.addClass( $popClasses )					
						.removeClass('ui-panel-left pop_fullscreen')
						.attr({'data-fixed':'top'})
						.css({ 'width' :  $menu.jqmData("width") || self.options.menuWidth, 
							   'min-width' : $menu.jqmData("minWidth") || self.options.menuMinWidth })
						.append('<div class="popover_triangle" />')					
						.find('.ui-page .ui-content').addClass('overthrow');

				$mid.addClass( $popClasses )					
						.removeClass('ui-panel-mid pop_fullscreen')
						.attr({'data-fixed':'top'})
						.css({'width': $mid.jqmData("width") || self.options.midWidth, 
								'min-width': $mid.jqmData("minWidth") || self.options.midMinWidth })
						.append('<div class="popover_triangle" />')			
						.find('.ui-page .ui-content').addClass('overthrow');
					
				$main.removeClass('ui-panel-right pop_fullscreen')
						.addClass('ui-panel-active')
						.find('div:jqmData(role="page")').andSelf()
						.css({'width':'', 'margin-left':'', 'min-width':''});
			
				$popover.removeClass('pop_fullscreen')
						.addClass('ui-popover');
				
				} else {						
					// fullscreen mode - will also be assigned by Gulliver. Not sure this is needed!
					$allPanels.addClass('pop_fullscreen ui-panel-hidden').removeClass('ui-popover ui-panel-active');
					}
					
			
			// popover button			
			self.popoverBtn("plain");
			
			},
				
		splitView: function (e) {			
			
			// --- PURPOSE ---		
			// 1. set up splitview - this mode is now handling 1,2,3 panels. If there is a single panel specified (should be main), 
			//    this will take up all available space (previously panel-type="fullwidth"). 
			// 2. Assign all necessary classes, and clear up any popver classes left
			// 3. Set width and margin of menu and mid panel			
			
			// --- CALLED FROM ---
			// 1. splitScreen() - depending on screen size and orientation			
						
			// --- UPDATES ---
			// JQM 1.1 RC2: added third panel support, 
			//              switched width/min-width into options settable through jqmData(width) and jqmData(minWidth)
			//              
			
			// --- TODO ---
			// beware of panelWidth if feeding other events like "resize" into here. panelWidth() call needs to be adjusted
				
			var self = this,
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),				
				$popover = $wrap.find('div:jqmData(panel="popover")'), 
				$switch = self.options.switchable || $wrap.jqmData("switchable"),
				$switchOnLoad = self.options.switchableHideOnLoad || $wrap.jqmData("switchableHideOnLoad"),
				$popClasses = 'ui-popover pop_menuBox ui-triangle-top ui-panel-visible';
				// removed ui-fixed-element-faux-top/bottom
				
			$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode ui-fullscreen-mode');
			
			$menu.removeClass( $popClasses )				
					// removed ui-fixed-element-faux-top
					.addClass('ui-panel-left ui-panel-active')
					.removeAttr('status')
					.removeAttr('data-fixed')
					.find('.ui-page .ui-content').removeClass('overthrow').end()
					.children('.popover_triangle').remove().end()
					.find('div:jqmData(show="first") .closePanel').remove().end()					
			
			$mid.removeClass( $popClasses )					
					.addClass('ui-panel-mid ui-panel-active')
					.removeAttr('status')
					.removeAttr('data-fixed')
					.find('.ui-page .ui-content').removeClass('overthrow').end()
					.children('.popover_triangle').remove().end()
					.find('div:jqmData(show="first") .closePanel').remove().end()									
			
			$main.addClass('ui-panel-right ui-panel-active');
						
			$popover.removeClass('pop_fullscreen').addClass('ui-popover')
					.find('.ui-page .ui-content').addClass('overthrow');
						
			if ( $switch && $switchOnLoad ){							
					
					// hide menu and mid - main will be fullwidth
					$menu.add( $mid ).css({'width':'', 'min-width':'', 'display':'none'}).attr('status','hidden');
					} else {
					
						// regular, set width and min-width according to options or specified by user
						$menu.css({'width': $menu.jqmData("width") || self.options.menuWidth, 
								'min-width': $menu.jqmData("minWidth") || self.options.menuMinWidth, 
								'display':''})
							.attr('status','visible');
													
						$mid.css({'width': $mid.jqmData("width") || self.options.midWidth, 
								'min-width': $mid.jqmData("minWidth") || self.options.midMinWidth, 
								'display':''})
							.attr('status', 'visible');
					
					}					
								
			// insert toggle buttons		
			if ( $switch ){	
				
				self.popoverBtn("switchable");
				} else {					
					// remove any toggle buttons left if switching from popover to splitview					
					$(".mmToggle").remove();
					
					// update header button controlgroup
					self.setBtns("update")
					}
			},						
								
		splitScreen: function( event ) {	
			
			// --- PURPOSE ---		
			// 1. Determine which screenmode to run - either splitview (panels side by side) or popover/yield. Depends on orientation AND screensize		
			
			// --- CALLED FROM ---
			// 1. setupMultiview() - for every wrapper page that is loaded initially or externally
			// 2. orientationchange 
			// (3. resize - would be possible, but this is really a strain on the browser and really of no use, so it's turned off)
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	
			//              
			
			// --- TODO ---
			// fiddle in yield-mode
			
			var self = this,
				$window = $(window);
			
			if ( $('div:jqmData(wrapper="true")').find('div:jqmData(panel="menu"), div:jqmData(panel="main"), div:jqmData(panel="mid")').length == 0 ) {				
				return;
				}
			// event can be "init" or [or-change object]	
			if ( event ) {				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > self.options.$upperThresh)  {						
						self.splitView( event);
						} else {						
							self.popover( event);
							}					 
					}
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > self.options.$upperThresh) {							
						self.splitView( event);
						} else {
							self.popover( event);
							}
						// click, resize, init events
						// TODO, block trash-events "from Triggers etc."
						} else if ($window.width() < self.options.$upperThresh){								
							self.popover( event );
							}
							else if ($window.width() > self.options.$upperThresh) {	
								self.splitView( event );
								}		
				}
					
			}, 			
	
/* -------------------------------------- PANEL/PAGE/CONTENT FORMATTING -------------------------------------- */
			
		gulliver: function() {
		
			// --- PURPOSE ---		
			// 1. set classes for fullscreen mode, remove button-text on denoted buttons, activate backPageHeight, so when a panel is opened
			//    in fullscreen mode, the height of the page in the back gets modified to match the page height of the front page.
			
			// --- CALLED FROM ---
			// 1. Orientationchange
			// 2. SetupMultiview - once per wrapper page
						
			// --- UPDATES ---
			// JQM 1.1 RC2: 	
			//              
			
			// --- TODO ---
			// clean up iconposSwitcher
			// add yield mode
		
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
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
					// deactivate, because otherweise event fires twice multiplying buttons
					// self.popover();
					}
				
				// tweak for fullscreen mode
				$allPanels.removeClass('ui-triangle-top ui-triangel-bottom ui-popover ui-popover-embedded')
						.addClass('pop_fullscreen')
						.find('.popover_triangle')
							.remove();
				
				// .iconposSwitcher - clean up!
				$(".iconposSwitcher-div .ui-btn").not('.noSwitch').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-div label, .iconposSwitcher-select label, .hideLabel").addClass("ui-hidden-accessible");
				
				$(".iconposSwitcher-input").closest('.ui-btn').attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-select").find('.ui-icon').css({'display':'none'})
				
				$(".noIconposSwitcher-div .ui-btn").attr('data-iconpos','none').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-none');
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
								
				// set a listener to adapt height of all active pages to the height of the page currently in view. 
				// if you have a long page in the background and fire a popover in fullscreen mode, the page length 
				// should match the popovers active page length, otherwise the background page is visible underneath
				$(document).on('pagebeforeshow', $popPanels.find('div:jqmData(role="page")'), function () {													
					self.backgroundPageHeight( $(this), "set" );
					});
				
				$('html').addClass('ui-fullscreen-mode').removeClass('ui-splitview-mode ui-popover-mode');
										
				} else {			
					
					// TODO: beware of splitview or popover mode...
					// TODO: not much happening here... 
					$('html').removeClass('ui-fullscreen-mode');
									
					}								

			$allPanels.each(function(index) {	
				
				// only fire if no back button exists, as this fires on resize, too...
				if ( $(this).find('.back_popover').length == 0 ) {
				
					// all panels' first pages' close-button
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="back"' : 'data-icon="close"'
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="a" class="back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
						$firstPage = $(this).find('div:jqmData(show="first")').not('.ui-splitview-mode div:jqmData(panel="menu") div:jqmData(role="page"), .ui-splitview-mode div:jqmData(panel="mid") div:jqmData(role="page")');
						
					//TODO: do I need to page() again?
					// $firstPage.page();
					$firstPage.find('div:jqmData(role="header") h1').before($backButton);
					// $(this).find('div:jqmData(show="first")').page();
					$firstPage.find('.back_popover').buttonMarkup();
					}
				});
			
			}, 
							
		panelWidth: function( update, fromWhere ) {					
			console.log("panelWidth called");
			// --- PURPOSE ---		
			// 1. set and adjust panel width and margin-left ~ similar to JQM updateLayout
			// 2. set and adjust nested page/header/footer width and margin-left, because (long story...) width/margin need to be set 
			//    on nested main pages, because otherwise they expand to 100%, because main is pos:rel, because if pos:static is used  
			//    transitions are visible all the way = see page being pulled up etc...)     			
			// 3. manage differences between width 25% and min-width: 250px (because if 25% < 250px panels will overlap)
			
			// --- CALLED FROM ---
			// 1. pagebeforeshow
			// 2. orientationchange
			// 3. plugin setup (initial setting)
			// 4. splitview setup
			// 5. showing popovers???
			
			// --- UPDATES ---
			// JQM 1.1 RC2: as fixed toolbars now switch between pos:fix and pos:abs, local headers and footers need specific width, because
			//              previous width: 100%/auto will cover full screen in pos:fix mode			
			
			// --- TODO ---
			// - check if JQM 1.1 scrollTop&fade allows main panel to be pos:static, thereby avoiding having to set width/margin-left on all main pages
			//   I needed to set pos:static anyway, check to see if transitions still work... 
			// - check if call on showing popovers is necessary	
			// - check that does not run multiple times in one instance
								
			var self = this,
				$main = $('div:jqmData(panel="main")'), 
				$mainPages = $main.find("div:jqmData(role='page')"), 
				$mainElems = $mainPages.find('.ui-header, .ui-footer'),
			
				$mid = $('div:jqmData(panel="mid")'), 
				$midPages = $mid.find("div:jqmData(role='page')"), 
				$midElems = $midPages.find('.ui-header, .ui-footer'),
			
				$menu = $('div:jqmData(panel="menu"):not("ui-popover")'), 
				$menuPages = $menu.find("div:jqmData(role='page')"), 
				$menuElems = $menuPages.find('.ui-header, .ui-footer'),
				
				$wrapWidth, 				
				
				// modifiy this depending on yield-mode and priority
				$mainWidth,
				$menuWidth = 0, 
				$midWidth = 0;
		
			// prevent multiple calls
			if ( self.options.$calcInProgress == false )  {	
				console.log("ONLY THIS ONE PASSES");
				// block multiple calls
				self.options.$calcInProgress = true;
				
				// This timeout is for Firefox, because we need to make sure panelHeight has run
				// before panelWidth fires. panelHeight makes sure global-header/footer + active 
				// panels > screenHeight = hiding scrollbars. In Firefox, panelWidth
				// calculates element width BEFORE panelHeight hides scrollbars, so without the timeout
				// the width is off by 17px (space the scrollbar needs), because panelWidth runs while
				//  the scrollbars are still visible.
				 window.setTimeout( function() {	
				
					$wrapWidth = $('div:jqmData(wrapper="true").ui-page-active').innerWidth();
											
					if (self.framer() != 'small' && $('html').hasClass('ui-splitview-mode') ) {
									
						// width = 0, if there is no menu/mid panel or they are hidden (switchable mode)
						$menuWidth = !$menu || !$menu.is(":visible") ? 0 : parseFloat($menu.outerWidth() );
						$midWidth = !$mid || !$mid.is(":visible") ? 0 : parseFloat($mid.outerWidth() );
						
						// set
						$menuPages.add( $menuElems ).css({ 'width' : $menuWidth });
						$midPages.add( $midElems ).css({ 'margin-left' : $menuWidth, 'width' : $midWidth });
																
						// should be the same across all view modes - set main panel/pages/toolbars	
						// but as Android does not give the correct width on orientationchange, this needs to go here
						// and must be set again for fullscreen mode
						$main.add( $mainPages ).css({'margin-left': $menuWidth+$midWidth, 'width':$wrapWidth-$menuWidth-$midWidth });
						// $mainPages.css({'margin-left': $menuWidth+$midWidth, 'width':$wrapWidth-$menuWidth-$midWidth });
						$mainElems.css({'width':$wrapWidth-$menuWidth-$midWidth, 'left':'auto'});
						
						} else if ( $('html').hasClass('ui-popover-mode') || $('html').hasClass('ui-fullscreen-mode')  ) {
							
							$main.add( $mainPages ).css({'margin-left': 0, 'width':"100%" })
							$mainElems.css({ 'width':'100%', 'left':'auto' })
							
							// this is the same as hiding panels on orientationchange
							$menuPages.add( $midPages ).css({'width':''});
							}
					
					// unlock
					self.options.$calcInProgress = false;
					
					},350);	
				}
	
			}, 

		panelHeight: function () {
			
			// --- PURPOSE ---		
			// 1. set panel-viewport height thereby also setting wrapper-page height to enable fixed-toolbars
			//    In regular JQM, the page-height is determined by the page-content. In multiview, the height of of nested pages is not "inherited up"
			//    to the wrapper page, because of the panel in between, which sets the wrapper-page height, thereby breaking the 
			//    fixed footer, which on hide jumps up the screen. 
			//    This function fixes this by setting panel height and corresponding wrapper-page height to 
			//	  a) the heighest active nested page height in regular mode
			//    b) screenheight less global toolbars in overthrow mode
			//    
			// 2. adjust nested page content padding for global header and footer			
			
			// --- CALLED FROM ---
			// 1. plugin setup (initial)
			// 2. orientationchange
			// 3. updatelayout???
			// 4. backgroundPageHeight after altering height of background-page
			// 5. panelTrans
			// 6. panelHash
			
			// --- UPDATES ---
			// JQM 1.1 RC2 		rewrite, set "Regular" and "overthrow" modes
			// 
			
			// --- TODO ---
			// - adjust padding in case there is a global AND local toolbar - padding should be double!			
			// - check to see whether this can be CALLED FROM updateLayout, e.g. when opening collapsibles - need to adjust!	
			// - simplify 
			// - check if use of margin is iOS-proof
			
							
			var self = this,				
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$panels = $wrap.find('.ui-panel:not(.ui-popover)'),
				$pages = $wrap.find('.ui-panel:not(.ui-popover) .ui-page'),
				$contents = $wrap.find('.ui-panel:not(.ui-popover) .ui-page .ui-content'),					
				
				$overthrow = $wrap.jqmData("scrollmode") == "overthrow",								
				$cond = $overthrow && ( !$('html').hasClass('ui-popover-mode') && !$('html').hasClass('ui-fullscreen-mode') ),				
				$blacklist = $('html').hasClass('blacklist'),
				$marPad = $blacklist ? ["margin-top", "margin-bottom"] : ["padding-top", "padding-bottom"],
				
				$glbH = $wrap.find('.ui-header-global:eq(0)'),
				$glbF = $wrap.find('.ui-footer-global:last'),
				
				$setHeight = 0,
				$locH, $locF, $dims, $localHeight;
			
			// sets nestes pages contents' padding/margin for - JQM updatePagePadding is only for wrapper page!
			// This is tricky, because on blacklisted browsers, margin needs to be set instead of padding to not hide 
			// the content behind the local toolbars (with pos: abs). Using padding will also work and position the
			// content correctly, but in overthrow mode this causes the scrollable section to scroll over the local header 
			// and footer VS scrolling behind.
			$contents.each(function() {
				
				$dims = {};
				$locH = $(this).siblings('.ui-header:eq(0)');
				$locF = $(this).siblings('.ui-footer:eq(0)');
				
				if ( $blacklist == true ) {
					// BLACKLIST - fixed and overthrow mode - marPad - should be margin-top/bottom 
					$dims[$marPad[0]] = $glbH.length > 0 ? $glbH.outerHeight() + $locH.outerHeight() : $locH.outerHeight(); 
					$dims[$marPad[1]] = $glbF.length > 0 ? $glbF.outerHeight() + $locF.outerHeight() : $locF.outerHeight();
																			
					} else if ( $cond ) {
						
						// this covers NONE-blacklist, overthrow mode. (Fixed mode is ok). 
						// in overthrow mode, padding-top/bottom needs to be 0 in order
						// for content section not to expand by 30px (2x15px JQM padding behind the footer.
						$dims["padding-top"] = "0px";
						$dims["padding-bottom"] = "0px";
						}
				// set
				$(this).css($dims);
				})
			
			
			// set panel/page/wrapper page height 			
			if ( $cond ) {								

				// this is for splitview-mode = fix screen to allow overthrow-based scrolling of multiple background panels
				
				$setHeight = $.mobile.getScreenHeight() - $glbH.outerHeight() - $glbF.outerHeight(); 
												
				// set panel and wrapper									
				$wrap.css({'overflow':'hidden' });
				
				// set content height
				$contents.each(function() {
					$localHeight = $(this).siblings('.ui-header:eq(0)').outerHeight() + $(this).siblings('.ui-footer:eq(0)').outerHeight();
					$(this).css({ 'height':$setHeight-$localHeight }).addClass("overthrow");
					});
		
				} else {
					// this is for popover-mode and fullscreen-mode, which should not use overthrow, because there is only one panel visible 
					// in the back at all times = use normal scrolling
			
					//get heighest height of active nested page													
					$panels.find('.ui-page-active').each(function() {						
						if ( $(this).outerHeight() > $setHeight ) {				
							$setHeight = $(this).outerHeight();
							}					
						});
						
				$contents.each( function() {
					$localHeight = $(this).siblings('.ui-header:eq(0)').outerHeight() + $(this).siblings('.ui-footer:eq(0)').outerHeight();
					$(this).css({ 'height':$setHeight-$localHeight });
					})	
					
					// set panel-height and wrapper-page height
					$('div:jqmData(panel="main"), div:jqmData(panel="mid"), div:jqmData(panel="menu")').css({'height': $setHeight});
					}											
					
				// overwrite menu height again, otherwise popover panels expand depending on content 			
				if ( $('html').hasClass('ui-popover-mode') ) { 					
					$('div:jqmData(panel="menu")').add('div:jqmData(panel="mid")').css({'height':''});
					}
			
			},
		
					
		backgroundPageHeight: function (page, mode) {
			
			// --- PURPOSE ---		
			// 1. In fullscreen mode (smartphones), the plugin opens popovers as fullscreen "pages". When you open a popover there 
			//    is an active background page (e.g. length 2000px) and the active page inside the popover (e.g. length 400px).  
			//    This function takes the height of the popover page (400px) and sets it to all active background pages (change 2000px to 400px)
			//    while the panel and page are visible. This way fullscreen-mode can use hardware scrolling and there is no 
			// 	  need to use overthrow. The function is set when the popover panel shows and cleared when it hides.
						
			// --- CALLED FROM ---
			// 1. pagebeforeshow on popover panel pages = when loading a new page into a panel
			// 2. showpanel in fullscreen mode to set 
			// 3. hidepanel in fullscreen mode to clear
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2 		call panelHeight to adjust fixed toolbars after alterning page height		
			
			// --- TODO ---
			// loose the 1px					
			
			var self = this,
				allActive = $('.ui-page').not( page ), 
				maxHeight;
			
			// only tweak page height if a popover panel is opened - this can also be the MENU oder MID in popover mode!!!
			if ( $('div:jqmData(panel="popover") .ui-page-active, div:jqmData(panel="menu").pop_fullscreen .ui-page-active, div:jqmData(panel="mid").pop_fullscreen .ui-page-active').length > 0 && mode == "set" ) {				
			
					maxHeight = page.outerHeight();
					allActive.addClass("shrunk")
								.css({	'height': maxHeight-1, 'overflow': 'hidden' })								
				}	
			
			// always try to clear
			if ( mode == "clear")  {						
				$('.shrunk').each( function() {
					allActive.css({'height': '', 'overflow': 'visible' }) })
								.removeClass('shrunk');
					}
						
			// always run panelHeight to adjust fixed toolbar positioning!
			self.panelHeight();
				
			},
			
		framer: function () {
			
			// --- PURPOSE ---		
			// 1. This function sets internal screen modes "small" <320px, "medium" >320 & <768px and "large" >768px
						
			// --- CALLED FROM ---
			// 1. Gulliver() - which sets small screen CSS = hides button texts, sets popovers to fullscreen etc.
			// 2. panelWidth() to make sure we are not in small mode
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2 		optionize threshold widths	
			
			// --- TODO ---
			// "supersize"? for TV? 
				
			var self = this;
				
				// layout mode - need to use $(window), because $this fails in IE7+8...										
				if ($.mobile.media("screen and (max-width:320px)")||($.mobile.browser.ie && $(window).width() < self.options.$lowerThresh )) {
					var framed = "small";
					} else if ($.mobile.media("screen and (min-width:768px)")||($.mobile.browser.ie && $(window).width() >= self.options.$upperThresh )) {
						var framed = "large";
						} else {
							var framed = "medium";
							}
							
			return framed;
			
			},			
		
/* -------------------------------------- HELPERS (some from JQM ) -------------------------------------- */				

		
		findClosestLink: function ( ele ) {			
			// --- PURPOSE ---		
			// 1. same as JQM
						
			// --- CALLED FROM ---
			// 1. clickRouting()
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//	This is also inside overthrow... Only use one. Removeing this breaks the script though
		
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
				
		clearActiveClasses: function ( trigger, useBruteForce, toPage, fromPage, link ) {										
		
			// --- PURPOSE ---		
			// 1. clear button classes on panels after and buttons after transitions
						
			// --- CALLED FROM ---
			// 1. panelTrans() = panel transition
			// 2. panelHash() = panel backwards transition
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//
			
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
			if (trigger == "panelHash" && ( toPage.closest('div:jqmData(panel="main")') || toPage.closest('div:jqmData(panel="menu")') || toPage.closest('div:jqmData(panel="mid")')  ) ) {
					window.setTimeout(function() {						
					$('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="mid")').find(".ui-page-active .ui-btn").removeClass( $.mobile.activeBtnClass );
					},500 );
				}
		
			},
					
		clickRouter: function( e, data, source ) {																
				
			// --- PURPOSE ---		
			// 1. in order to run both click based AND programmatic panel transitions through the same panelTrans() function, this function captures the click
			//    event on all clicks and stores it at option $stageEvent. The function captures and blocks multiple clicks and is triggered on vclick, so it
			//    always comes in before the click event and any other event firing. Guess the 300ms make this work :-)
									
			// --- CALLED FROM ---
			// 1. on click
			// 2. on vlick - whichever is faster
			 
			
			// --- UPDATES ---
			// 	JQM 1.1 RC2  added middle panel
			
			// --- TODO ---
			//
			
			var self = this, 
				link = self.findClosestLink( e.target );
				$link = $( link );
			
			if ( !link ) {
				return;
				}						
			
			// make sure only one vclick passes, because we only want the vclick event and only one
			// in case it's firing multiple times
			if ( self.options.$clickInProgress == false ) {
				self.options.$clickInProgress = true;
				
				if ( e.type == "vclick" && typeof $(link).jqmData("panel") != "undefined" && $(link).hasClass('toggle_popover') == false ) {											
					// store the click event/link element 								
					self.options.$stageEvent = $link;
					} 
					
				if ( e.type == "click" && $(link).jqmData('context') ) {
					// fire a second changePage					
					self.context( link );
					}	
				
			}
				
			},
			
/* -------------------------------------- PANEL NAVIGATION -------------------------------------- */			


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
								
					}
				
			},
	
		// panel transition handler - data is post-modified
		panelTrans: function (e, data) {																	
						
			var	self = this,
				$link = self.options.$stageEvent,						
				$targetPanelID = $( $link ).jqmData('panel'),					
				$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer,
				$targetPanelActivePage = $targetPanel.find( '.ui-page-active' ) || $targetPanel.find('div:jqmData(show="first")');
				
			// only continue if it's a panel transition, otherwise JQM does it			
			if ( $targetPanel.is('body') == false ) {
			
				data.options.fromPage = $targetPanelActivePage;
				data.options.pageContainer = $targetPanel;
				// data.options.changeHash = $targetPanel.jqmData('hash') == 'history' ? true : false;					
							
				// set scrollTop blocker to keep popover panels visible when loading a new page into the DOM									
				// removed || $currPanel.jqmData("panel") 
				if ( $targetPanel.jqmData("panel") == "popover" ) {					
					self.options.$panelTransBlockScrollTop = true;
					}
					
				// clear stageEvent for next transition
				self.options.$stageEvent = '';
				
				// unblock for the next click event
				self.options.$clickInProgress = false;				
				
				// call active class clearing				
				self.clearActiveClasses( "panelTrans", true, $(data.toPage), data.options.fromPage, $link );
								
				//make sure wrapper page stays activePage		
				$.mobile.activePage = $('div:jqmData(wrapper="true")');
				
				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				// $.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body'); 			
				$.mobile.pageContainer = $('body');
				
				// +1
				self.options.$transDelta = self.options.$transDelta + 1;
				// unblock
				window.setTimeout(function() { self.options.$pbcCoutner = 0;},250);
				
				} else {
					// console.log( JQM DOES THIS! );
					
					// still, if we are coming from a wrapper page, with panel transitions made, fromPage may not
					// always be set to the wrapper page, which will cause JQM to drop active class from the panel
					// page and leave the wrapper page active. To prevent this, check if the fromPage is on a panel,
					// if, so, change the fromPage to the wrapper page to make sure JQM can handle it correctly.
					if ( $( data.options.fromPage ).closest('div:jqmData(role="panel")').length > 0 ) { 
						data.options.fromPage = $( data.options.fromPage ).closest('div:jqmData(wrapper="true")');
						}
					}

				
		},
		
		// panel hashchange handler
		panelHash: function( e, data ) {				
				
				var self = this, $prevPage, $prevPanel, $prevFrom, $prevURL, 
					$tweakHist, $tweakPanel, $tweakPage, $tweakFrom, $tweakURL;
				
				// stop Android for 300ms
				window.setTimeout(function () { self.options.$blockMultiClick = false; }, 300);
				
				// back button 
				// TODO: button just unwinds history vs. clicking what's on it... :-)
				if ( self.options.$crumbsPanel != "" ) {												
					$prevPage = $('div#'+self.options.$crumbsID );
					$prevPanel = $('div:jqmData(id="'+self.options.$crumbsPanel+'")');
					}
					
				// browser back button
				if ( $.mobile.urlHistory.activeIndex > 1 ) {									
					$prevPage = $('div#'+$.mobile.urlHistory.getPrev().url);
					$prevPanel = $.mobile.urlHistory.getPrev().pageContainer;
					} else {																																
						// active index = 1, this is first page = wrapper page. Find not active page with data-show="first" on panel
						$prevPage = $('div:jqmData(show="first")').not( ".ui-page-active" );
						$prevPanel = $prevPage.closest('div:jqmData(role="panel")');
						}			
						
				// if there is no active page on the previous panel and no active wrapper page, we should be going from a JQM page back
				// to a wrapper page - JQM does this. Multiview handles the rest.				
				if ($prevPanel.find('.ui-page-active').length != 0 && $('div:jqmData(show="first").ui-page-active').length != $('div.ui-page-active').length-1) {					

					$prevURL = $prevPage.attr('id') ? window.location.pathname+"#"+$prevPage.attr('id') : window.location.pathname;
					$prevFrom = $prevPanel.find('.ui-page-active');

					// the challenge in using JQM's history vs. having a panel-based history is that JQM history does not 
					// recognize different panels when storing entries, so going from A1 > A2 and B1 > B2 > B3, will
					// create the following JQM urlHistory entries: "wrapper", A2, B2, B3. Clicking the back button once
					// will go to prev() = B2, this is correct. Clicking again, JQM will try to go to prev() = A2 from
					// A's panels active page, which also is A2, when in fact it should go from B2>B1.
					
					// To work around, we need to check if toPageID = fromPageID and if so, don't go prev(), but take the
					// page with activeIndex in urlHistory (B2 in the above example), get this pages panel (B) and go back
					// through the history to find the next page with the same panelID. This page should be toPage, the 
					// activeIndex Page will be fromPage and after the transition, new ActiveIndex needs to be set to the
					// original toPage. 									
					if ( $prevPage.attr('id') == $prevFrom.attr('id') ) {	
						$tweakHist = true;
						$tweakFrom = $( 'div#'+$.mobile.urlHistory.getActive().url );
						$tweakPanel = $tweakFrom.closest('div:jqmData(role="panel")');
						
						// loop through history from top to find next page with panelID matching tweakPanel
						// if no page is found in urlHistory, grab the first page on this panel
						for (i = $.mobile.urlHistory.activeIndex-1; i>=0; i--) {						
							if ( $tweakPanel.jqmData('id') == $.mobile.urlHistory.stack[i].pageContainer.jqmData('id') || i == 0 ) {										
								$tweakPage = i == 0 ? $('div#'+$tweakPanel.find('div:jqmData(show="first")').attr('id') ) 
										: $('div#'+$.mobile.urlHistory.stack[i].url );
								break;
								}
							}
						// construct a string, because we don't want to pass objects to JQM	
						$tweakURL = $tweakPage.attr('id') ? window.location.pathname+"#"+$tweakPage.attr('id') : window.location.pathname;
						}

					// reset
					self.options.$crumbsID = "";
					self.options.$crumbsPanel = "";
					
					// set
					data.options.pageContainer = $tweakPanel || $prevPanel; 
					data.toPage = $tweakURL || $prevURL;
					data.options.fromPage = $tweakFrom || $prevFrom;
					data.options.reverse = true;
					// data.options.transition = "fade";
																			
					// reset crumbs button pass
					self.options.$allowCrumbsHashToPass = false;
					
					// unblock for the next click event
					self.options.$clickInProgress = false;					
					
					// Clear active classes
					self.clearActiveClasses( "panelHash", true, $(data.toPage), data.options.fromPage );

					//make sure wrapper page stays activePage		
					// $.mobile.activePage = $('div:jqmData(wrapper="true")');
					
					// reset page container to prevent regular JQM loading pages into a container
					// pageContainer will be re-set on next panel-transition to correct panel,
					// but if a regular JQM transition fires pageContainer would be stuck at the 
					// panel the last page was loaded into. Therefore reset (like for the loader:
					//$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body'); 										
					$.mobile.pageContainer = $('body');
					
					// set active index	- omitting this also causes endless loop...					
					if ( $tweakHist = true ) {					
						$.mobile.urlHistory.activeIndex =  $.mobile.urlHistory.activeIndex - 1;				
						$tweakHist = false; 
						}							
					
					// -1
					self.options.$transDelta = self.options.$transDelta -1;
					
					// unblock
					window.setTimeout(function() { self.options.$pbcCoutner = 0;},250);
					
					
				 } else { 
				
					console.log("JQM DOES THIS, let's fuck it up");
					console.log( data );
					
				}
				// unblock again
				self.options.$blockMultiPbc = false;


		},
		
		panelDeepLink: function () {
						
			// load deeplinked pages						
			var self = this,
				// grab deeplink from HTML tag
				$deepPage = $( $('html').data("deep") ),
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
			// will be closed by (3) - added a check there for data("deep") :-)
			// window.setTimeout(function(){												
				// show popover if there is one, but only if it's not visible already				
				if ($triggerButton && !$deepPanel.is(':visible') ) {					
					$triggerButton.trigger('click'); 
					}
				// }, 500);
			
				// make sure, there is no trailing hashChange messing things up
				// self.options.$ignoreMyOwnNextHashChange = false;
								
				// load deeplink page
				$.mobile.changePage($deepPage, {fromPage:$deepFrom, transition:"slide", reverse:true, changeHash:false, pageContainer:$deepPanel});
				
			// fix pageHeight
			self.panelHeight()
			
			// tidy up HTML deeplink
			$('html').removeData("deep");
			
			},

		
/* -------------------------------------- EVENT BINDINGS -------------------------------------- */

		_mainEventBindings: function () {
	
			var self = this;
			
			// https://forum.jquery.com/topic/solution-in-search-of-the-root-problem
			// supposedly increase scroll performance of lists in iOS?
			$(document).bind("vmouseover", function () {});
			
			// on vlick store crumbs ID and panel to redirect in hashChange!
            $(document).on('vclick.crumbs', 'a.ui-crumbs', function (e, data ) {											
			
				var that = $(this);
				self.options.$crumbsID = $( that ).attr('href');
				self.options.$crumbsPanel = $( that ).jqmData('panel');
				});
			
			// toggle popover
			$(document).on('click','a.toggle_popover', function(e) {															
		
				self.showPanel(e, $(this) );
				// since this button also passes clickrouting, this needs to be reset 
				// alternatively on toggle_popover buttons, the data-panel trigger (relating to the panel-id needs to be changed)				
				self.options.$clickInProgress = false;
				});
			
			$(document).on("vclick.clickRouting", function( e, data ) { 	
				
				// need to bind to vclick, because binding to click = 300ms, so it not possible
				// to pass event data to options and retrieve them in panelTrans, because by
				// the time click fires, panelTrans has already run.
				// vclick however fires way before panelTrans, so this is used to store
				// click related information
				self.clickRouter( e, data, "vclick" );
				});
			
			// panel transition handler 
			$(document).on( "pagebeforechange", function( e, data ) {				
			
				// This is not done nicely, but necessary because JQM in non-pushstate environments just loads the first page, if
				// "no to" page is specified in _handleHashChange. This happens when going backwards from the 2nd page visisted to
				// the inital page.
				
				// This does not work in a panel setup, because this could be a "Panel X 2nd-page" to "Panel X 1st-page" transition
				// where JQM just wants to load the first history entry (= wrapper-page) altogether. This works ok in pushstate environments, 
				// because pushstate is passing a URL (first entry in urlHistory) and the trailing hashchange is ignored. In non-pushstate environments
				// however, only the "trailing" hashchange fires, which does not include a URL, hence "to" is not defined in _handleHashChange,
				// hence JQM just loads the first page. This would be ok, BUT all initial panel pages, which have not been active, will 
				// not be activated, so the panels will stay blank.
				
				// An easy workaround would be to make sure, when loading the first page, that all nested pages first pages are enhanced 
				// and activated, which didn't work.
				
				// The difficult workaround is below = taking the hashChange object and converting it to a string with the correct 
				// data.toPage specified. The string will trigger a panelHash, which will modify the data.options, so the whole thing passes
				// as a "to" transition, which is sort of breaking the JQM logic.
				
				// BAD, because "activeIndex" may go into negative (-1) and manually upping it to 0 causes endless loops
				// BAD, because this requires an on/off flag to only allow the first hashChange coming into here to pass into the function
				// AND it requires to count all forward and backwards transitions, to determine, when to override the hashChange with the correct URL. 
				
				// The following now works for both pushstate and non-pushstate devices				
				if ( self.options.$pbcCoutner == 0 ) {
					self.options.$pbcCoutner = 1;					
					
					if ( data.options.fromHashChange == true && self.options.$transDelta == 1 ) {												
						for (i = 0; i < $.mobile.urlHistory.stack.length; i++) {							
							if ( $.mobile.urlHistory.stack[i].pageContainer.get(0).tagName != 'BODY') {								
								var fix = $.mobile.urlHistory.stack[i].pageContainer.find('div:jqmData(show="first")').attr('id');
								//alert("last one, passing "+fix);																
								// shouldn't be a URL, but to make sure, find a better way than just adding a "#"								
								data.toPage = '#'+fix;									
								break;
								}							
							}
						
						} 
				}
				
				// This blocks all objects coming through here. Similar to $.mobile.urlHistory.ignoreNextHashChange 								
				if (typeof data.toPage !== 'string') {										
					return;						
					}		
									
				if ( data.options.fromHashChange == true ) {						
					
					// this ensures multiple pagebeforechange events do not pass through here					
					if ( self.options.$blockMultiPbc == false ) {
						self.options.$blockMultiPbc = true;
						self.panelHash( e, data );
						}
					} else {							
						self.panelTrans( e, data );
						}					
					
						
				});

			// blocking multiple clicks on Android back button
			$(window).on('hashchange', function(e, data) {														
				
				if ( self.options.$blockMultiClick == false ) {										
					self.options.$blockMultiClick = true;
					}
				
				});
			
			// make sure header is at css:top 0 when closing keyboard in iOS
			$(document).on("blur","div:jqmData(wrapper='true') input", function () {
				$(".ui-header-fixed, .ui-element-fixed-top" ).css("top","0 !important");
				});
			
			// listener for plugin setup and crumbify buttons
			// TODO: separate
			$(document).on('pagebeforeshow', 'div:jqmData(role="page")', function(event, data){																	
			
				var page = $(this);
				
				// if pageshow is for a wrapper-page, setup the plugin
				if ( page.jqmData('wrapper') == true ) {	
					
					// make sure visible panels have an active first-page on backwards transitions
					if ( page.find('.ui-panel[status="visible"] .ui-page-active').length == 0 ) { 
						page.find('div:jqmData(show="first")').addClass('ui-page-active');
						}
					
					// if it's a deeplink page, fire panelDeeplink
					if ( $('html').data("deep") && page.find( $('html').data("deep")+"" ).length >= 1  ) {																														
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
						
						// The whole thing is necessary, because the plugin setup
						// adds active-page to the first page on every panel. If
						// I let this fire with every changePage, the firstpage 
						// will never loose active-page and thus always be visible
						// If I omit this call, the 2nd wrapper page loaded into 
						// the DOM will not get the plugin setup and be blank.
						
						// What this does: The counter for the first wrapper page
						// is set to 0 on plugin-init so it runs through here once,
						// gets changed to 1 and thus is blocked from going through
						// again. If a new wrapper is loaded it doesn't have any 
						// counter, so I'm also letting "undefined" pass and then set 
						// the counter for this wrapper to 1, so on the next changePage,  
						// pageshow will fire on the wrapper page, but as counter is now 
						// 1, it will not run through here. This took a while...
						var inc = 1;
						page.data("counter", 0+inc);
						} 
						
					// the crumbs part	
					// as it's a wrapper page we don't need crumble buttons on it, so stop here
					event.preventDefault();
					
					} else if ( page.closest('div:jqmData(role="panel")').jqmData('hash') && page.jqmData("show") != "first" ){	
							
							// set panelHeight
							self.panelHeight();
						
							// fires crumble every time a page is shown							
							// window.setTimeout(function() {								
								self.crumble(event, data, page );
							//	}, 50);
						} 
				});
						
			$(document).on("pagebeforeshow", 'div:jqmData(role="page")', function(e){				
				// need to wait until transition is done, otherwise width of pages pulled in
				// externally cannot be adjusted 
				window.setTimeout(function(){
					self.panelWidth( false,"external back&forth");
					},10);
					self.panelHeight();							
				});		
				
			// fire splitviewCheck on orientationchange (and resize)
			$(window).on('orientationchange', function(event){					
				self.splitScreen(event);
				self.panelWidth( true, "orientationchange", "update") 
				self.panelHeight();
				self.gulliver();
				});
			
			}
		
	});

/** -------------------------------------- PLUGIN TRIGGER -------------------------------------- **/
	
	$('html').data("lockup","unlocked");

	// initialize single instance
	var trigger = $(document).on('pagecreate', 'div:jqmData(wrapper="true")',function(event){ 	
			
		if ($('html').data("lockup") == "unlocked") {
			// counter to make sure the plugin fires only once on every wrapper
			$(this).data("counter",0);
			$(this).multiview();
			$('html').data("lockup","locked");
		}
	});

}) (jQuery,this);


/** -------------------------------------- overthrow -------------------------------------- **/

/*! overthrow v.0.1.0. An overflow:auto polyfill for responsive design. (c) 2012: Scott Jehl, Filament Group, Inc. http://filamentgroup.github.com/overthrow/license.txt */

(function( w, undefined ){
	
	var doc = w.document,
		docElem = doc.documentElement,
		classtext = "overthrow-enabled",
	
		// Touch events are used in the polyfill, and thus are a prerequisite
		canBeFilledWithPoly = "ontouchmove" in doc,
		
		// The following attempts to determine whether the browser has native overflow support
		// so we can enable it but not polyfill
		overflowProbablyAlreadyWorks = 
			// Features-first. iOS5 overflow scrolling property check - no UA needed here. thanks Apple :)
			"WebkitOverflowScrolling" in docElem.style ||
			// Touch events aren't supported and screen width is greater than X
			// ...basically, this is a loose "desktop browser" check. 
			// It may wrongly opt-in very large tablets with no touch support.
			( !canBeFilledWithPoly && w.screen.width > 1200 ) ||
			// Hang on to your hats.
			// Whitelist some popular, overflow-supporting mobile browsers for now and the future
			// These browsers are known to get overlow support right, but give us no way of detecting it.
			(function(){
				var ua = w.navigator.userAgent,
					// Webkit crosses platforms, and the browsers on our list run at least version 534
					webkit = ua.match( /AppleWebKit\/([0-9]+)/ ),
					wkversion = webkit && webkit[1],
					wkLte534 = webkit && wkversion >= 534;
					
				return (
					/* Android 3+ with webkit gte 534
					~: Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13 */
					ua.match( /Android ([0-9]+)/ ) && RegExp.$1 >= 3 && wkLte534 ||
					/* Blackberry 7+ with webkit gte 534
					~: Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0 Mobile Safari/534.11+ */
					ua.match( / Version\/([0-9]+)/ ) && RegExp.$1 >= 0 && w.blackberry && wkLte534 ||
					/* Blackberry Playbook with webkit gte 534
					~: Mozilla/5.0 (PlayBook; U; RIM Tablet OS 1.0.0; en-US) AppleWebKit/534.8+ (KHTML, like Gecko) Version/0.0.1 Safari/534.8+ */   
					ua.indexOf( /PlayBook/ ) > -1 && RegExp.$1 >= 0 && wkLte534 ||
					/* Firefox Mobile (Fennec) 4 and up
					~: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:2.1.1) Gecko/ Firefox/4.0.2pre Fennec/4.0. */
					ua.match( /Fennec\/([0-9]+)/ ) && RegExp.$1 >= 4 ||
					/* WebOS 3 and up (TouchPad too)
					~: Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.0; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/233.48 Safari/534.6 TouchPad/1.0 */
					ua.match( /wOSBrowser\/([0-9]+)/ ) && RegExp.$1 >= 233 && wkLte534 ||
					/* Nokia Browser N8
					~: Mozilla/5.0 (Symbian/3; Series60/5.2 NokiaN8-00/012.002; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/533.4 (KHTML, like Gecko) NokiaBrowser/7.3.0 Mobile Safari/533.4 3gpp-gba 
					~: Note: the N9 doesn't have native overflow with one-finger touch. wtf */
					ua.match( /NokiaBrowser\/([0-9\.]+)/ ) && parseFloat(RegExp.$1) === 7.3 && webkit && wkversion >= 533
				);
			})(),
			
		// Easing can use any of Robert Penner's equations (http://www.robertpenner.com/easing_terms_of_use.html). By default, overthrow includes ease-out-cubic
		// arguments: t = current iteration, b = initial value, c = end value, d = total iterations
		// use w.overthrow.easing to provide a custom function externally, or pass an easing function as a callback to the toss method
		defaultEasing = function (t, b, c, d) {
			return c*((t=t/d-1)*t*t + 1) + b;
		},	
			
		enabled = false,
		
		// Keeper of intervals
		timeKeeper,
				
		/* toss scrolls and element with easing
		
		// elem is the element to scroll
		// options hash:
			* left is the desired horizontal scroll. Default is "+0". For relative distances, pass a string with "+" or "-" in front.
			* top is the desired vertical scroll. Default is "+0". For relative distances, pass a string with "+" or "-" in front.
			* duration is the number of milliseconds the throw will take. Default is 100.
			* easing is an optional custom easing function. Default is w.overthrow.easing. Must follow the easing function signature 
		*/
		toss = function( elem, options ){
			var i = 0,
				sLeft = elem.scrollLeft,
				sTop = elem.scrollTop,
				// Toss defaults
				o = {
					top: "+0",
					left: "+0",
					duration: 100,
					easing: w.overthrow.easing
				},
				endLeft, endTop;
			
			// Mixin based on predefined defaults
			if( options ){
				for( var j in o ){
					if( options[ j ] !== undefined ){
						o[ j ] = options[ j ];
					}
				}
			}
			
			// Convert relative values to ints
			// First the left val
			if( typeof o.left === "string" ){
				o.left = parseFloat( o.left );
				endLeft = o.left + sLeft;
			}
			else {
				endLeft = o.left;
				o.left = o.left - sLeft;
			}
			// Then the top val
			if( typeof o.top === "string" ){
				o.top = parseFloat( o.top );
				endTop = o.top + sTop;
			}
			else {
				endTop = o.top;
				o.top = o.top - sTop;
			}

			timeKeeper = setInterval(function(){					
				if( i++ < o.duration ){
					elem.scrollLeft = o.easing( i, sLeft, o.left, o.duration );
					elem.scrollTop = o.easing( i, sTop, o.top, o.duration );
				}
				else{
					if( endLeft !== elem.scrollLeft ){
						elem.scrollLeft = endLeft;
					}
					if( endTop !== elem.scrollTop ){
						elem.scrollTop = endTop;
					}
					intercept();
				}
			}, 1 );
			
			// Return the values, post-mixin, with end values specified
			return { top: endTop, left: endLeft, duration: o.duration, easing: o.easing };
		},
		
		// find closest overthrow (elem or a parent)
		closest = function( target, ascend ){
			return !ascend && target.className && target.className.indexOf( "overthrow" ) > -1 && target || closest( target.parentNode );
		},
				
		// Intercept any throw in progress
		intercept = function(){
			clearInterval( timeKeeper );
		},
			
		// Enable and potentially polyfill overflow
		enable = function(){
				
			// If it's on, 
			if( enabled ){
				return;
			}
			// It's on.
			enabled = true;
				
			// If overflowProbablyAlreadyWorks or at least the element canBeFilledWithPoly, add a class to cue CSS that assumes overflow scrolling will work (setting height on elements and such)
			if( overflowProbablyAlreadyWorks || canBeFilledWithPoly ){
				docElem.className += " " + classtext;
			}
				
			// Destroy everything later. If you want to.
			w.overthrow.forget = function(){
				// Strip the class name from docElem
				docElem.className = docElem.className.replace( classtext, "" );
				// Remove touch binding (check for method support since this part isn't qualified by touch support like the rest)
				if( doc.removeEventListener ){
					doc.removeEventListener( "touchstart", start, false );
				}
				// reset easing to default
				w.overthrow.easing = defaultEasing;
				
				// Let 'em know
				enabled = false;
			};
	
			// If overflowProbablyAlreadyWorks or it doesn't look like the browser canBeFilledWithPoly, our job is done here. Exit viewport left.
			if( overflowProbablyAlreadyWorks || !canBeFilledWithPoly ){
				return;
			}

			// Fill 'er up!
			// From here down, all logic is associated with touch scroll handling
				// elem references the overthrow element in use
			var elem,
				
				// The last several Y values are kept here
				lastTops = [],
		
				// The last several X values are kept here
				lastLefts = [],
				
				// lastDown will be true if the last scroll direction was down, false if it was up
				lastDown,
				
				// lastRight will be true if the last scroll direction was right, false if it was left
				lastRight,
				
				// For a new gesture, or change in direction, reset the values from last scroll
				resetVertTracking = function(){
					lastTops = [];
					lastDown = null;
				},
				
				resetHorTracking = function(){
					lastLefts = [];
					lastRight = null;
				},
				
				// After releasing touchend, throw the overthrow element, depending on momentum
				finishScroll = function(){
					// Come up with a distance and duration based on how 
					// Multipliers are tweaked to a comfortable balance across platforms
					var top = ( lastTops[ 0 ] - lastTops[ lastTops.length -1 ] ) * 8,
						left = ( lastLefts[ 0 ] - lastLefts[ lastLefts.length -1 ] ) * 8,
						duration = Math.max( Math.abs( left ), Math.abs( top ) ) / 8;
					
					// Make top and left relative-style strings (positive vals need "+" prefix)
					top = ( top > 0 ? "+" : "" ) + top;
					left = ( left > 0 ? "+" : "" ) + left;
					
					// Make sure there's a significant amount of throw involved, otherwise, just stay still
					if( !isNaN( duration ) && duration > 0 && ( Math.abs( left ) > 80 || Math.abs( top ) > 80 ) ){
						toss( elem, { left: left, top: top, duration: duration } );
					}
				},
			
				// On webkit, touch events hardly trickle through textareas and inputs
				// Disabling CSS pointer events makes sure they do, but it also makes the controls innaccessible
				// Toggling pointer events at the right moments seems to do the trick
				// Thanks Thomas Bachem http://stackoverflow.com/a/5798681 for the following
				inputs,
				setPointers = function( val ){
					inputs = elem.querySelectorAll( "textarea, input" );
					for( var i = 0, il = inputs.length; i < il; i++ ) {
						inputs[ i ].style.pointerEvents = val;
					}
				},
				
				// For nested overthrows, changeScrollTarget restarts a touch event cycle on a parent or child overthrow
				changeScrollTarget = function( startEvent, ascend ){
					if( doc.createEvent ){
						var newTarget = ( !ascend || ascend === undefined ) && elem.parentNode || elem.touchchild || elem,
							tEnd;
								
						if( newTarget !== elem ){
							tEnd = doc.createEvent( "HTMLEvents" );
							tEnd.initEvent( "touchend", true, true );
							elem.dispatchEvent( tEnd );
							newTarget.touchchild = elem;
							elem = newTarget;
							newTarget.dispatchEvent( startEvent );
						}
					}
				},
				
				// Touchstart handler
				// On touchstart, touchmove and touchend are freshly bound, and all three share a bunch of vars set by touchstart
				// Touchend unbinds them again, until next time
				start = function( e ){
					
					// Stop any throw in progress
					intercept();
					
					// Reset the distance and direction tracking
					resetVertTracking();
					resetHorTracking();
						
					elem = closest( e.target );
						
					if( !elem || elem === docElem || e.touches.length > 1 ){
						return;
					}			

					setPointers( "none" );
					var touchStartE = e,
						scrollT = elem.scrollTop,
						scrollL = elem.scrollLeft,
						height = elem.offsetHeight,
						width = elem.offsetWidth,
						startY = e.touches[ 0 ].pageY,
						startX = e.touches[ 0 ].pageX,
						scrollHeight = elem.scrollHeight,
						scrollWidth = elem.scrollWidth,
					
						// Touchmove handler
						move = function( e ){
						
							var ty = scrollT + startY - e.touches[ 0 ].pageY,
								tx = scrollL + startX - e.touches[ 0 ].pageX,
								down = ty >= ( lastTops.length ? lastTops[ 0 ] : 0 ),
								right = tx >= ( lastLefts.length ? lastLefts[ 0 ] : 0 );
								
							// If there's room to scroll the current container, prevent the default window scroll
							if( ( ty > 0 && ty < scrollHeight - height ) || ( tx > 0 && tx < scrollWidth - width ) ){
								e.preventDefault();
							}
							// This bubbling is dumb. Needs a rethink.
							else {
								changeScrollTarget( touchStartE );
							}
							
							// If down and lastDown are inequal, the y scroll has changed direction. Reset tracking.
							if( lastDown && down !== lastDown ){
								resetVertTracking();
							}
							
							// If right and lastRight are inequal, the x scroll has changed direction. Reset tracking.
							if( lastRight && right !== lastRight ){
								resetHorTracking();
							}
							
							// remember the last direction in which we were headed
							lastDown = down;
							lastRight = right;
							
							// set the container's scroll
							elem.scrollTop = ty;
							elem.scrollLeft = tx;
						
							lastTops.unshift( ty );
							lastLefts.unshift( tx );
						
							if( lastTops.length > 3 ){
								lastTops.pop();
							}
							if( lastLefts.length > 3 ){
								lastLefts.pop();
							}
						},
					
						// Touchend handler
						end = function( e ){
							// Apply momentum based easing for a graceful finish
							finishScroll();
							// Bring the pointers back
							setPointers( "auto" );
							setTimeout( function(){
								setPointers( "none" );
							}, 450 );
							elem.removeEventListener( "touchmove", move, false );
							elem.removeEventListener( "touchend", end, false );
						};
					
					elem.addEventListener( "touchmove", move, false );
					elem.addEventListener( "touchend", end, false );
				};
				
			// Bind to touch, handle move and end within
			doc.addEventListener( "touchstart", start, false );
		};
		
	// Expose overthrow API
	w.overthrow = {
		set: enable,
		forget: function(){},
		easing: defaultEasing,
		toss: toss,
		intercept: intercept,
		closest: closest,
		support: overflowProbablyAlreadyWorks ? "native" : canBeFilledWithPoly && "polyfilled" || "none"
	};
	
	// Auto-init
	enable();
		
})( this );

/*! hashscroll overthrow.js extension: eased scroll to elements via hashchange, within an overthrow element. (c) 2012: Scott Jehl, Filament Group, Inc. Dual MIT/BSD license */
(function( w, undefined ){
	// set the hash-based links to scroll to a desired location
	if( w.overthrow && w.addEventListener ){
		
		function scrollToElem ( elem ){
			// XXX FREQUENT FIX: Issue #7
			overthrow.intercept();
			var throwParent = overthrow.closest( elem );
			if( throwParent ){
				overthrow.toss(
					throwParent,
					{ 
						left: elem.offsetLeft - throwParent.offsetLeft,
						top: elem.offsetTop - throwParent.offsetTop
					}
				);
			}
		}
		
		w.document.addEventListener( "click", function( e ){					
		
			// XXX FREQUENT, block right-click	
			var link = e.target, 
				xLink = $( findClosestLink(e.target) );
			
			if ( !xLink || xLink.length == 0 || e.which > 1) {					
					return;
					} 	

			if( link && link.className.indexOf( "throw" ) > -1 ){
				var hash = link.href.split( "#" )[ 1 ],
					elem = w.document.getElementById( hash );
					
				if( elem ){
					e.preventDefault();
					scrollToElem( elem );
					w.location.hash = hash;
				}	
			}	
		}, false);
						
		function findClosestLink(ele) {				
			var self = this;
			while (ele){
				if (ele.nodeName.toLowerCase() == "a"){
					break;
					}
				ele = ele.parentNode;
				}
			return ele;
			}	
		
	}		
})( this );

