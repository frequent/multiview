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
			  * self.options.lowerThresh|upperThresh
		      * threshold screen widths
			  * 0px - 320px 	= "small"	fullscreen-mode
			  * 320px - 768px	= "medium"	popover-mode, yield-mode or offset-mode
			  * 768px - 		= "large"	splitview-mode
		      */		
			lowerThresh: 320,						
			upperThresh: 768, 			
			
			/**
			  * self.options.switchable|switchableHideOnLoad
		      * popover buttons for menu/mid panel will be visible in splitview mode, can be used to toggle hide/show panels
		      */			
			switchable: false,			
			switchableHideOnLoad: false,
			
			/**
			  * self.options.menuTxt|menuBtnTheme|menuBtnIcon|menuBtnIconPos
		      * configure menu button, can be set here or on the panel using data-menuTxt="some_text"
		      */			
			menuTxt: 'Menu',
			menuBtnTheme: 'a',
			menuBtnIcon: 'gear',
			menuBtnIconPos: 'left',
			
			/**
			  * self.options.midTxt|midBtnTheme|midBtnIcon|midBtnIconPos
		      * configure mid button, same as above
		      */
			midTxt: 'Mid',
			midBtnTheme: 'a',
			midBtnIcon: 'gear',
			midBtnIconPos: 'left',		
			
			/**
			  * self.options.menuWidth|menuMinWidth
		      * configure width of menu panel, can also be set on the panel using data-menuWidth="xy%"
		      */
			menuWidth: '25%',
			menuMinWidth: '250px',
			
			/**
			  * self.options.midWidth|midMinWidth
		      * configure width of mid panel, same as above
		      */
			midWidth: '25%',
			midMinWidth: '250px',
			
			/**
			  * self.options.siteMap
		      * stores external pages which are loaded into the site, so fromPage can be identified
			  * on backwards transitions. <not active:>Plus, this should contain all external pages not 
			  * "on board" when the wrapper loads to enable deeplinking to these pages.
			  * 
			  * format [ type: "external|deeplink", data: "data" ] 
		      */			
			siteMap: [],
			
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
			  * self.options.$stageEvent
		      * store click events, so they are available for overriding changepage options
		      */			
			$stageEvent: '',
						
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

				// need to call page(), otherwise fromPage.data("page") is undefined on first panel transition
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
				$dropZone = onPage.find('div:jqmData(role="header")') || onPage.closest('div:jqmData(wrapper="true").ui-page-active').children('div:jqmData(role="header")'),				
				$prevPage = $( data.prevPage ), 
				$prevPageID = data.prevPage.attr('id'),				
				$prevHead = $prevPage.find('.ui-header'),
				$prevText; 
			
			if ( onPage.jqmData("show") != "first")  {										
								
				$prevText = $prevHead.find('.ui-title').text() || $prevPageID;
					
					// panel MUST be the panel the new page is on
					$prevPanelID = $prevPage.closest('div:jqmData(role="panel")').jqmData("id"),
					// theme from current page!
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
		   * name: 	      	popoverBtn
		   * called from: 	popover() - regular popover button (same as for yield mode) / splitview() - switchable button							
		   * purpose: 		add popover buttons for menu|mid. If both panels are used it will be a 2-button controlgroup
		   * ADD YIELD MODE
		   * @param {string}  buttonType (info who called)
		   */	
		popoverBtn: function ( buttonType ) {
			
			var self = this,									
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),			
				$mdBt = '',
				$mnBt = '',				
				
				$globalHeader = $wrap.find('.ui-header-global'),
				$localHeader = $wrap.find('div:jqmData(panel="main") div:jqmData(role="page") .ui-header'),
				$flexPos = $wrap.find('div:jqmData(role="page") div:jqmData(drop-pop="true")'),
				
				// button(s) go to (1) user-specified location (2) global header (3) local headerS (4) pageS content				
				$dropZone = $flexPos.length ? 
					$flexPos : $globalHeader.length ? 
						$globalHeader : $localHeader.length ? 
							$localHeader : $wrap.find('div:jqmData(panel="main") .ui-content');
										
				// menu button 
				if ( $menu ) {					
					var $mnId = $wrap.find('div:jqmData(panel="menu")').jqmData('id'),
						$mnIc = $menu.jqmData('menu-icon') || self.options.menuBtnIcon,	
						$mnIp = $menu.jqmData('menu-iconpos') || self.options.menuBtnIconPos,
						$mnTh = $menu.jqmData('menu-theme') || self.options.menuBtnTheme,
						$mnTx = $menu.jqmData('menu-text') || self.options.menuTxt,
						
						$mnBt = $('<a data-iconpos="'+$mnIp+'" data-icon="'+$mnIc+'" data-role="button" href="#" data-panel="'+$mnId+'" data-theme="'+$mnTh+'" class="ui-btn-up-'+$mnTh+' ui-btn ui-btn-icon-'+$mnIp+' ui-shadow  iconposSwitcher-a toggle_popover mmToggle menuToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mnTx+'</span><span class="ui-icon ui-icon-'+$mnIc+' ui-icon-shadow">&nbsp;</span></span></a>');
					}
					
				// mid button 
				if ( $mid ) {					
					var $mdId = $wrap.find('div:jqmData(panel="mid")').jqmData('id'),
						$mdIc = $mid.jqmData('mid-icon') || self.options.midBtnIcon,	
						$mdIp = $mid.jqmData('mid-iconpos') || self.options.midBtnIconPos,
						$mdTh = $mid.jqmData('mid-theme') || self.options.midBtnTheme,
						$mdTx = $mid.jqmData('mid-text') || self.options.midTxt,
						
						$mdBt = $('<a data-iconpos="'+$mdIp+'" data-icon="'+$mdIc+'" data-role="button" href="#" data-panel="'+$mdId+'" data-theme="'+$mdTh+'" class="ui-btn-up-'+$mdTh+' ui-btn ui-btn-icon-'+$mdIp+' ui-shadow  iconposSwitcher-a toggle_popover mmToggle midToggle"><span class="ui-btn-inner"><span class="ui-btn-text">'+$mdTx+'</span><span class="ui-icon ui-icon-'+$mdIc+' ui-icon-shadow">&nbsp;</span></span></a>');
					}
					
				$buttons = $mnBt.add( $mdBt );

			// switchable classes			
			if (buttonType == "switchable") {
				$menu.add( $mid ).addClass('switchable');
				}
			
			// handover
			self.setBtns( "add", $dropZone, $buttons );

			},

		/**
		   * name: 	      	setBtns
		   * called from: 	popoverBtn and crumble
		   * purpose: 		central function to insert buttons (single, controlgroup, controlgroup with existing buttons!)		   
		   * @param {string}  action = what to do, add/update, update is just re-setting corners
		   * @param {object}  $dropZone = where button(s) should be placed
		   * @param {object}  $elements = button(s)
		   */
		setBtns: function ( action, $dropZone, $elements ) {

			var self = this, 				
				$crns = 'ui-btn-corner-all ui-btn-corner-right',				
				$button, $first, $prevBtn, $newBtn, $lftWrp, $buttons, $ctrlGrp, $this, $clear, $filter;
										
			if ( action != "update" ) {
				
				$dropZone.each(function() {
					
					$this = $(this),  
					$lftWrp = $('<div />').addClass("headWrapLeft ui-btn-left"),		
					$ctrlGrp = $('<div />').attr({'data-role':'controlgroup', 'data-type':'horizontal'}).addClass('btnSwitchBoard').controlgroup(), 					
					$buttons = $elements.clone();
					
					// (a) empty dropZone => create wrap and controlgroup, insert button(s)				
					if ( $this.find('.ui-btn-left').length == 0 && $this.find('.btnSwitchBoard').length == 0  ) {
						
						if ( $this.is( ".ui-header" ) ) {														
							$this.prepend( $lftWrp.html( $ctrlGrp.html( $buttons ) ) );
							} else {								
								$this.prepend( $ctrlGrp.html( $buttons ) );
								}
														
					} else {
						
						if ( $this.find('.ui-btn-left.ui-btn').length ) {
							
							// (b1) there is a button = edge case, since plugin always should add wrapper and controlgroup and place buttons inside
							$button = $this.find('.ui-btn-left.ui-btn');
							
							// "skin" and replace with controlgroup
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
								
								// (b2) there is sth, either a wrapper inside a header or a controlgroup inside a user specified element
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
																		
									// TODO: improve - filter for existing buttons									
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
		
/** -------------------------------------- SCREEN MODE HANDLER -------------------------------------- **/

		/**
		   * name: 	      	  popover
		   * called from: 	  splitscreen()
		   * purpose: 		  set up popover mode
		   * ADD data-yield-to="none" - to set starting panel in yield-mode!
		   * @param {object}  event		   
		   */
		popover: function (e) {
			
			var self = this,				
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),
				$popover = $wrap.find('div:jqmData(panel="popover")'),
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$popClasses = 'ui-popover pop_menuBox ui-panel-active ui-triangle-top',
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

		/**
		   * name: 	      	  splitView
		   * called from: 	  splitScreen() - depending on screen size and orientation
		   * purpose: 		  set up splitiview mode for 1/2/3 panels
		   * ADD data-yield-to="none" - to set starting panel in yield-mode!
		   * ADD no panel support (regular JQM page)
		   * @param {object}  event		   
		   */			
		splitView: function (e) {				
   
			var self = this,
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$menu = $wrap.find('div:jqmData(panel="menu")'),
				$mid = $wrap.find('div:jqmData(panel="mid")'),
				$main = $wrap.find('div:jqmData(panel="main")'),				
				$popover = $wrap.find('div:jqmData(panel="popover")'), 
				$switch = self.options.switchable || $wrap.jqmData("switchable"),
				$switchOnLoad = self.options.switchableHideOnLoad || $wrap.jqmData("switchableHideOnLoad"),
				$popClasses = 'ui-popover pop_menuBox ui-triangle-top ui-panel-visible';			
				
			$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode ui-fullscreen-mode');
			
			$menu.removeClass( $popClasses )									
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
					
					// switchable
					$menu.add( $mid ).css({'width':'', 'min-width':'', 'display':'none'}).attr('status','hidden');
					} else {
					
						// regular
						$menu.css({'width': $menu.jqmData("width") || self.options.menuWidth, 
								'min-width': $menu.jqmData("minWidth") || self.options.menuMinWidth, 
								'display':''})
							.attr('status','visible');
													
						$mid.css({'width': $mid.jqmData("width") || self.options.midWidth, 
								'min-width': $mid.jqmData("minWidth") || self.options.midMinWidth, 
								'display':''})
							.attr('status', 'visible');
					
					}					
								
			// toggle buttons		
			if ( $switch ){					
				self.popoverBtn("switchable");
				} else {					
					// remove any toggle buttons left if switching from popover to splitview					
					$(".mmToggle").remove();
					
					// update header button controlgroup
					self.setBtns("update")
					}
			},						

		/**
		   * name: 	      	  splitScreen
		   * called from: 	  setupMultiview() - for every wrapper page that is loaded initially or externally, also on orientationchange and resize
		   * purpose: 		  determine which screenmode to run
		   * ADD yield-mode
		   * @param {object}  event		   
		   */	
		splitScreen: function( event ) {	
			
			var self = this,
				$window = $(window);
			
			if ( $('div:jqmData(wrapper="true")').find('div:jqmData(panel="menu"), div:jqmData(panel="main"), div:jqmData(panel="mid")').length == 0 ) {				
				return;
				}
				
			// event can be "init" or real event
			if ( event ) {				
				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > self.options.upperThresh)  {						
						self.splitView( event);
						} else {						
							self.popover( event);
							}					 
					}
					
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > self.options.upperThresh) {							
						self.splitView( event);
						} else {
							self.popover( event);
							}
						
						// click, resize, init events						
						} else if ($window.width() < self.options.upperThresh){								
							self.popover( event );
							}
							else if ($window.width() > self.options.upperThresh) {	
								self.splitView( event );
								}		
				}
					
			}, 			
	
/** -------------------------------------- PANEL/PAGE/CONTENT FORMATTING -------------------------------------- **/
		
		/**
		   * name: 	      	  gulliver
		   * called from: 	  setupMultiview() and orientationchange
		   * purpose: 		  set classes for fullscreen mode, manage backPageHeight
		   * ADD yield-mode
		   * @param {object}  event		   
		   */	
		gulliver: function() {
		
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu"), div:jqmData(panel="mid")'),
				$popPanels = $('div:jqmData(panel="popover")'),
				
				maxHeight = 0, checkHeight, parsedHeight
			
			// popover height > available screen height? 
			$popPanels.each(function(){					
					checkHeight = $(this).css('height');
					parsedHeight = parseFloat(checkHeight);
						
					if ( parsedHeight > maxHeight) {						
						maxHeight = parsedHeight;
						}
					});
					
			// fullscreen mode, if width < 320px OR popovers are bigger than screen height
			if ( self.framer() == "small" || maxHeight > $(window).height() ) {																
				
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
					 
					$('html').removeClass('ui-fullscreen-mode');
					}								

			$allPanels.each(function(index) {	
				
				// add close button
				if ( $(this).find('.back_popover').length == 0 ) {
									
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="back"' : 'data-icon="close"'
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="a" class="back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
						$firstPage = $(this).find('div:jqmData(show="first")').not('.ui-splitview-mode div:jqmData(panel="menu") div:jqmData(role="page"), .ui-splitview-mode div:jqmData(panel="mid") div:jqmData(role="page")');
						
					$firstPage.find('div:jqmData(role="header") h1').before($backButton);					
					$firstPage.find('.back_popover').buttonMarkup();
					}
				});
			
			}, 
		
		/**
		   * name: 	      	  panelWidth
		   * called from: 	  pagebeforeshow, orientationchange, initial setup
		   * purpose: 		  adjust width of all background panels (including heade/footer/content), manage difference between 25% and 250px
		   * ADD yield-mode
		   * @param {string}  update (or recalculate)
		   * @param {string}  who called
		   */
		panelWidth: function( update, fromWhere ) {					
				
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
				
				// TODOT: modifiy this depending on yield-mode and priority
				$mainWidth,
				$menuWidth = 0, 
				$midWidth = 0;
		
			// prevent multiple calls
			if ( self.options.$calcInProgress == false )  {	

				self.options.$calcInProgress = true;
				
				// This timeout is for Firefox, because we need to make sure panelHeight has run
				// before panelWidth fires, because panelHeight set the height of the page so no 
				// scrollbars are needed. But Firefox calculates panelWidth BEFORE panelHeight()
				// hides scrollbars, so the width is off by 17px (space the scrollbar needs).
				// Therefore need to wait...
				// TODO: find a better way, this visibly stalls the page
				 window.setTimeout( function() {	
				
					$wrapWidth = $('div:jqmData(wrapper="true").ui-page-active').innerWidth();
											
					if (self.framer() != 'small' && $('html').hasClass('ui-splitview-mode') ) {
									
						// width = 0 ? > no menu/mid or switchable mode
						$menuWidth = !$menu || !$menu.is(":visible") ? 0 : parseFloat($menu.outerWidth() );
						$midWidth = !$mid || !$mid.is(":visible") ? 0 : parseFloat($mid.outerWidth() );
						
						// set
						$menuPages.add( $menuElems ).css({ 'width' : $menuWidth });
						$midPages.add( $midElems ).css({ 'margin-left' : $menuWidth, 'width' : $midWidth });
						
						// As Android does not give the correct width on orientationchange, this needs to go here
						// and must be set again for fullscreen mode
						$main.add( $mainPages ).css({'margin-left': $menuWidth+$midWidth, 'width':$wrapWidth-$menuWidth-$midWidth });						
						$mainElems.css({'width':$wrapWidth-$menuWidth-$midWidth, 'left':'auto'});
						
						} else if ( $('html').hasClass('ui-popover-mode') || $('html').hasClass('ui-fullscreen-mode')  ) {
							
							$main.add( $mainPages ).css({'margin-left': 0, 'width':"100%" })
							$mainElems.css({ 'width':'100%', 'left':'auto' })

							$menuPages.add( $midPages ).css({'width':''});
							}
					
					// unlock
					self.options.$calcInProgress = false;
					
					},50);	
				}
	
			}, 

		/**
		   * name: 	      	  panelHeight
		   * called from: 	  plugin setup, orientationchange, backgroundPageHeight, panelTrans/panelHash
		   * purpose: 		  Set page margin/padding and panel-height (panels are viewports!), thereby also setting wrapper-page height to enable fixed toolbars.
		   *				  In regular JQM, page-height is determined by page-content. In multiview, the nested page-content is not
		   *				  "inherited upwards" to the wrapper-page, because of the panel in between thereby breaking fixed toolbars
		   *				  (jump to top of screen on hide). This function fixes this, by setting panel-height (and wrapper-page-height)
		   *				  to the height of the nested page with the largest height (regular) or screen-height less global toolbars (overthrow mode)
		   *				  ... love my English... 
		   * ADJUST padding if global&local toolbars are used & simplyfy
		   */
		panelHeight: function () {
							
			var self = this,				
				$wrap = $('div:jqmData(wrapper="true").ui-page-active'),
				$panels = $wrap.find('.ui-panel:not(.ui-popover)'),
				$pages = $wrap.find('.ui-panel:not(.ui-popover) .ui-page'),
				$contents = $wrap.find('.ui-panel:not(.ui-popover) .ui-page .ui-content'),					
				
				$overthrow = $wrap.jqmData("scrollmode") == "overthrow",								
				$cond = $overthrow && ( !$('html').hasClass('ui-popover-mode') && !$('html').hasClass('ui-fullscreen-mode') ),	
				
				// Tricky, because on blacklisted browsers, margin needs to be set instead of padding to not hide 
				// the content behind the local toolbars (which have pos: absolute if fixed). Using padding would also work 
				// and position the content correctly, BUT in overthrow mode this causes the scrollable section to scroll 
				// OVER the local header and footer VS scrolling behind. So, if blacklist, need to use margin instead of padding...	
				$blacklist = $('html').hasClass('blacklist'),
				$marPad = $blacklist ? ["margin-top", "margin-bottom"] : ["padding-top", "padding-bottom"],
				
				$glbH = $wrap.find('.ui-header-global:eq(0)'),
				$glbF = $wrap.find('.ui-footer-global:last'),
				
				$setHeight = 0,
				$locH, $locF, $dims, $localHeight;
			
			// margin/padding		
			$contents.each(function() {
				
				$dims = {};
				$locH = $(this).siblings('.ui-header:eq(0)');
				$locF = $(this).siblings('.ui-footer:eq(0)');
				
				if ( $blacklist == true ) {
					// BLACKLIST - should be margin-top/bottom 
					$dims[$marPad[0]] = $glbH.length > 0 ? $glbH.outerHeight() + $locH.outerHeight() : $locH.outerHeight(); 
					$dims[$marPad[1]] = $glbF.length > 0 ? $glbF.outerHeight() + $locF.outerHeight() : $locF.outerHeight();
																			
					} else if ( $cond ) {
						
						// NONE-blacklist, overthrow mode. (Fixed mode is ok by default :-). 
						// In overthrow mode, padding-top/bottom needs to be 0, otherwise 
						// margin&padding will be set = 2x15px too much
						$dims["padding-top"] = "0px";
						$dims["padding-bottom"] = "0px";
						}
				// set
				$(this).css($dims);
				})
			
			
			// height 			
			if ( $cond ) {								

				// splitview-mode = fix screen to allow overthrow-based scrolling of multiple background panels			
				$setHeight = $.mobile.getScreenHeight() - $glbH.outerHeight() - $glbF.outerHeight(); 
												
				// set panel and wrapper									
				$wrap.css({'overflow':'hidden' });
				
				// set content height
				$contents.each(function() {
					$localHeight = $(this).siblings('.ui-header:eq(0)').outerHeight() + $(this).siblings('.ui-footer:eq(0)').outerHeight();
					$(this).css({ 'height':$setHeight-$localHeight }).addClass("overthrow");
					});
		
				} else {
					// popover-mode/fullscreen-mode = no overthrow, because there is only one panel visible at a time = use hardware scrolling
					
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
					
					// set 
					$('div:jqmData(panel="main"), div:jqmData(panel="mid"), div:jqmData(panel="menu")').css({'height': $setHeight});
					}											
					
				// overwrite menu height again, otherwise popover panels expand depending on content 			
				if ( $('html').hasClass('ui-popover-mode') ) { 					
					$('div:jqmData(panel="menu")').add('div:jqmData(panel="mid")').css({'height':''});
					}
			
			},
		
		/**
		   * name: 	      	  backgroundPageHeight
		   * called from: 	  pagebeforeshow on popover panels, showPanel ("set"), hidePanel("clear")
		   * purpose: 		  In fullscreen mode (smartphone) popovers are opened as fullscreen pages, so when opening a popover
		   *				  there will be an active background page (say 2000px length). If the popover is only 400px length 
		   *				  you can scroll down and see 1600px of the background page. To prevent this and allow hardware
		   *				  scrolling (no overthrow), this function takes the popover active page height and sets it to
		   *                  the background page (switch from 2000px to 400px) while the popover is visible.
		   * @param {object}  page
		   * @param {string}  mode set|clear
		   */
		backgroundPageHeight: function (page, mode) {
			
			var self = this,
				allActive = $('.ui-page').not( page ), 
				maxHeight;
			
			// only tweak if popover is opened
			if ( $('div:jqmData(panel="popover") .ui-page-active, div:jqmData(panel="menu").pop_fullscreen .ui-page-active, div:jqmData(panel="mid").pop_fullscreen .ui-page-active').length > 0 && mode == "set" ) {				
			
					maxHeight = page.outerHeight();
					allActive
						.addClass("shrunk")
							.css({	'height': maxHeight-1, 'overflow': 'hidden' })								
				}	
			
			// always try to clear
			if ( mode == "clear")  {						
				$('.shrunk').each( function() {
					allActive
						.css({'height': '', 'overflow': 'visible' }) })
							.removeClass('shrunk');
					}
						
			// always run panelHeight to adjust fixed toolbar positioning!
			self.panelHeight();
				
			},
		
		/**
		   * name: 	      	  framer
		   * called from: 	  gulliver and panelWidth
		   * purpose: 		  This function sets internal screen modes, which could be overwritten by plugin options.
		   *				  Important because this determines when to switch between popover and splitview and when to show 
		   *				  pages in fullscreen mode!
		   * SUPERSIZE?
		   * @return {string} screen mode small|medium|large
		   */
		framer: function () {
				
			var self = this;
				
				if ($.mobile.media("screen and (max-width:320px)")||($.mobile.browser.ie && $(window).width() < self.options.lowerThresh )) {
					var framed = "small";
					} else if ($.mobile.media("screen and (min-width:768px)")||($.mobile.browser.ie && $(window).width() >= self.options.upperThresh )) {
						var framed = "large";
						} else {
							var framed = "medium";
							}
							
			return framed;			
			},			
		
/** -------------------------------------- HELPERS (some from JQM ) -------------------------------------- **/				
	
		/**
		   * name: 	      	  findClosestLink
		   * called from: 	  clickRouting
		   * purpose: 		  same as JQM		   
		   * @param {object}  element
		   * ALSO USES IN OVERTHROW - removing either one breaks script...
		   */
		findClosestLink: function ( ele ) {			
			
			while ( ele ) {				
				if ( ( typeof ele.nodeName === "string" ) && ele.nodeName.toLowerCase() == "a" ) {					
					break;
					}				
				ele = ele.parentNode;
				}		
			return ele;
			
			},
		
		/**
		   * name: 	      	  clearActiveClasses
		   * called from: 	  clear button classes on panels after and buttons after transitions
		   * purpose: 		  same as JQM		   
		   * @param {string}  trigger = who called		   
		   * @param {object}  toPage
		   * @param {object}  fromPage
		   * @param {object}  link element
		   * NOT WORKING WELL
		   */		   
		clearActiveClasses: function ( trigger, toPage, fromPage, link ) {										
			
			var self = this;
			
			// clear buttons
			if (link) {
				link.closest('.ui-btn').addClass('ui-clicked-me');
				link.closest('div:jqmData(role="page")').find('.ui-btn-active').not('.ui-clicked-me').removeClass('ui-btn-active');
				link.closest('.ui-btn').removeClass('ui-clicked-me');
				}

			// clear links if transition inside panel
			if (toPage.closest('div:jqmData(role="panel")').jqmData("id") == fromPage.closest('div:jqmData(role="panel")').jqmData("id")  ) {																							
					window.setTimeout( function() {
						fromPage.find('.ui-btn').removeClass( $.mobile.activeBtnClass );
					},500 );
				} 
							
			// clear links on reverse transition				
			if (trigger == "panelHash" && ( toPage.closest('div:jqmData(panel="main")') || toPage.closest('div:jqmData(panel="menu")') || toPage.closest('div:jqmData(panel="mid")')  ) ) {
					window.setTimeout(function() {						
					$('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="mid")').find(".ui-page-active .ui-btn").removeClass( $.mobile.activeBtnClass );
					},500 );
				}
		
			},
		
		/**
		   * name: 	      	  clickRouter
		   * called from: 	  click and vclick
		   * purpose: 		  to be able to run click AND programmatic panel transitions through the same function, this function stores click events on
		   *				  vclick in option $stageEvent, so by the time the click fires, the event and data can be made available. Guess the 300ms click
		   *				  delay makes this work :-). Also handles context changePage.
		   * @param {object}  event
		   * @param {object}  data
		   * @param {string}  who called		   
		   */
		clickRouter: function( e, data, source ) {																

			var self = this, 
				link = self.findClosestLink( e.target );
				$link = $( link );
			
			if ( !link ) {
				return;
				}						
			
			// only one vclick may pass			
			if ( self.options.$clickInProgress == false ) {
				self.options.$clickInProgress = true;
				
				if ( e.type == "vclick" && typeof $(link).jqmData("panel") != "undefined" && $(link).hasClass('toggle_popover') == false ) {											
					// store the click event/link element 								
					self.options.$stageEvent = $link;
					} 
					
				if ( e.type == "click" && $(link).jqmData('context') ) {
					// trigger panelContext					
					self.panelContext( link );
					}	
				
			}
				
			},
			
/** -------------------------------------- PANEL NAVIGATION -------------------------------------- **/			

		/**
		   * name: 	      	  panelContext
		   * called from: 	  clickRouting
		   * purpose: 		  fires the 2nd changePage on context changepages (changePage A1 > A2 in panel A and B1 > B2 in panel B)
		   * MAKE SURE THIS WORKS, NOT POSSIBLE IN FULLSCREEN MODE
		   * @param {object}  event
		   */
		panelContext: function( object ) {	
				
				var self = this,
					$context = object,
					$targetPanelID = $context.jqmData('context-panel');
				
				// not in fullscreen mode... bad
				if ( !$('html').hasClass('ui-fullscreen-mode') ) {
					
					$.mobile.pageContainer = $('div:jqmData(panel="'+$targetPanelID+'")');

					// context changePage
					$.mobile.changePage( $( $context.jqmData('context') ), { transition:'slide', changeHash:true, fromHashChange: false, pageContainer: $.mobile.pageContainer });
					
					// block next hashChange transition					
					self.options.$contextBlockNextHashChange = true;
								
					}
				
			},
	
		/**
		   * name: 	      	  panelTrans
		   * called from: 	  mainEvents on pagebeforechange
		   * purpose: 		  handles forward transitions by overwriting changepage options (no preventDefault)		   
		   * @param {object}  event
		   * @param {object}  data
		   */
		panelTrans: function (e, data) {																	
						
			var	self = this,
				$link = self.options.$stageEvent,						
				$targetPanelID = $( $link ).jqmData('panel'),					
				$targetPanel = $link ? $('div:jqmData(id="'+$targetPanelID+'")') : data.options.pageContainer,
				$targetPanelActivePage = $targetPanel.find( '.ui-page-active' ) || $targetPanel.find('div:jqmData(show="first")');
				
			// if panel transition
			if ( $targetPanel.is('body') == false ) {
			
				data.options.fromPage = $targetPanelActivePage;
				data.options.pageContainer = $targetPanel;
							
				// block scrollTop to keep popover panels visible when loading a new page into the DOM
				// NECESSARY?
				if ( $targetPanel.jqmData("panel") == "popover" ) {					
					self.options.$panelTransBlockScrollTop = true;
					}
					
				// clean up stage
				self.options.$stageEvent = '';
				
				// unblock for next click
				self.options.$clickInProgress = false;				
				
				// clean active classes				
				self.clearActiveClasses( "panelTrans", $(data.toPage), data.options.fromPage, $link );
								
				// keep active
				// $.mobile.activePage = $('div:jqmData(wrapper="true")');
				
				// reset pageContainer to default			
				$.mobile.pageContainer = $('body');
				
				// +1 aka keep count of panel transitions
				self.options.$transDelta = self.options.$transDelta + 1;
				
				// unblock multiple pagebeforechange 
				window.setTimeout(function() { self.options.$pbcCoutner = 0;},250);
				
				} else {
					
					// = JQM territory
					
					// still, if we are coming from a wrapper page, with panel transitions made, fromPage may not
					// always be set to the wrapper page, which will cause JQM to drop active class from the panel
					// page and leave the wrapper page active. 
					
					// To prevent this, check if the fromPage is on a panel and if so, change fromPage from
					// panelPage to wrapper Page to make sure JQM handles this correctly					
					if ( $( data.options.fromPage ).closest('div:jqmData(role="panel")').length > 0 ) { 
						data.options.fromPage = $( data.options.fromPage ).closest('div:jqmData(wrapper="true")');
						}
					}

				
		},
		
		/**
		   * name: 	      	  panelHash
		   * called from: 	  mainEvents on pagebeforechange
		   * purpose: 		  handles backwards transitions by overwriting changepage options (no preventDefault)
		   * BACKBUTTON UNWINDS HISTORY VS DOING WHAT IT SAYS
		   * @param {object}  event
		   * @param {object}  data
		   */
		panelHash: function( e, data ) {				

				var self = this, 
					$prevPage, 
					$prevPanel, 
					$prevFrom, 
					$prevURL, 
					$tweakHist, 
					$tweakPanel, 
					$tweakPage, 
					$tweakFrom, 
					$tweakURL,
					$extUrl, 
					$extPrs, 
					smfp = "", 
					smtp = "";
				
				// stall Android for 300ms
				window.setTimeout(function () { self.options.$blockMultiClick = false; }, 300);
				
				// back button 
				if ( self.options.$crumbsPanel != "" ) {												
					$prevPage = $('div#'+self.options.$crumbsID );
					$prevPanel = $('div:jqmData(id="'+self.options.$crumbsPanel+'")');
					}		
					
				// browser back
				if ( $.mobile.urlHistory.activeIndex > 1 ) {	
					$prevPage = $('div#'+$.mobile.urlHistory.getPrev().url);
					$prevPanel = $.mobile.urlHistory.getPrev().pageContainer;
					} else {			
						// active index = 1 = wrapper page. Find non-active page with data-show="first"
						$prevPage = $('div:jqmData(show="first")').not( ".ui-page-active" );
						$prevPanel = $prevPage.closest('div:jqmData(role="panel")');
						}			
				
				// if panel transition			
				if ($prevPanel.find('.ui-page-active').length != 0 && $('div:jqmData(show="first").ui-page-active').length != $('div.ui-page-active').length-1) {					
					
					// the easy way
					$prevURL = $prevPage.attr('id') ? window.location.pathname+"#"+$prevPage.attr('id') : window.location.pathname;
					$prevFrom = $prevPanel.find('.ui-page-active');

					// doesn't always work... 
					// the challenge in using JQM's history (with pageContainer added) vs. having a panel-based history is that 
					// JQM history does not recognize different panels when storing entries, so going from nested pages A1 > A2  
					// and B1 > B2 > B3, will create the following JQM urlHistory entries: "wrapper", A2, B2, B3. Clicking the back 
					// button once will go to prev() = B2, this is correct. Clicking again, JQM will try to go to prev() = A2 from
					// A's panels active page, which also is A2, when in fact it should go from B2 > B1.
					
					// To work around, we need to check if toPageID = fromPageID and if so, don't go prev(), but take the
					// page with activeIndex in urlHistory (B2 in the above example), get this page's panel (B) and go back
					// through the history to find the next page with the same panelID. This page should be toPage, the 
					// activeIndex Page will be fromPage and after the transition, new ActiveIndex needs to be set to the
					// original toPage... However, this will not work for external pages, because the urlHistory will only 
					// contain the external page url and pageContainer and constructing fromPage and pageContainer for
					// the backwards transition based on a full url will result in empty objects [], thus the backwards
					// transition will fail.
					
					// The easy way around this for external pages is to select the data-show="first" page from the panel
					// the external page is sitting in. But in case the external page was called from the 2nd or 3rd page
					// of this panel or from another external page loaded in before, this will not give the correct page. 
					// Therefore we are using the complicated way of storing external pages "data" objects in self.options.siteMap.  
					// On backwards panel transitions, the sitemap is scanned for pages with matching toPage. If found, 
					// fromPage and pageContainer are constructed from the stored "data" object. If nothing is found,  
					// we assume this has to follow the above routine. 
					
					if ( $prevPage.attr('id') == $prevFrom.attr('id') ) {
						
						// check sitemap
						for (j = 0; j < self.options.siteMap.length; j++) {
							$extUrl = self.options.siteMap[i-1].data.toPage;
							$extPrs = $.mobile.path.parseUrl( $extUrl );							
							if ( $.mobile.urlHistory.getActive().url === $extUrl.replace($extPrs.domain, "") ) {
								// set from and to
								smfp = self.options.siteMap[i-1].data.options.fromPage;
								smtp = self.options.siteMap[i-1].data.toPage; 								
								}
							break;
							}	
						
						$tweakHist = true;
						// external
						if ( smfp == "" && smtp == "" ) {							
							$tweakFrom = $( 'div#'+$.mobile.urlHistory.getActive().url );
							$tweakPanel = $tweakFrom.closest('div:jqmData(role="panel")');
							} else  {
								// internal
								$tweakFrom = $('div:jqmData(url="'+ smtp.replace( $.mobile.path.parseUrl( smtp ).domain,'')+'")'  );
								$tweakPanel = smfp.closest('div:jqmData(role="panel")');
								}

						// loop through urlHistory
						for (i = $.mobile.urlHistory.activeIndex-1; i>=0; i--) {							
							if ( $tweakPanel.jqmData('id') == $.mobile.urlHistory.stack[i].pageContainer.jqmData('id') || i == 0 ) {																		
								$tweakPage = i == 0 ? $('div#' + $tweakPanel.find('div:jqmData(show="first")').attr('id') )
										: $('div#'+$.mobile.urlHistory.stack[i].url );										
								break;
								}
							}

						// construct a string, because we don't want to pass objects to JQM	(creating an endless pagebeforechange loop)
						$tweakURL = $tweakPage.attr('id') ? 
								window.location.pathname+"#"+$tweakPage.attr('id') : 
									window.location.pathname;
						}

					// reset
					self.options.$crumbsID = "";
					self.options.$crumbsPanel = "";					

					// set
					data.options.pageContainer = $tweakPanel || $prevPanel; 
					data.toPage = $tweakURL || $prevURL;
					data.options.fromPage = $tweakFrom || $prevFrom;
					data.options.reverse = true;					
					
					// unblock
					self.options.$clickInProgress = false;					
					
					// clean up
					self.clearActiveClasses( "panelHash", $(data.toPage), data.options.fromPage );

					//make sure wrapper page stays activePage		
					// $.mobile.activePage = $('div:jqmData(wrapper="true")');
					
					// reset pageContainer to default			
					$.mobile.pageContainer = $('body');
					
					// set active index	- omitting this also causes endless loop...					
					if ( $tweakHist = true ) {					
						$.mobile.urlHistory.activeIndex =  $.mobile.urlHistory.activeIndex - 1;				
						$tweakHist = false; 
						}							
					
					// -1 aka keep track of transitions
					self.options.$transDelta = self.options.$transDelta -1;
					
					// unblock
					window.setTimeout(function() { self.options.$pbcCoutner = 0;},250);
					
					
				 } else { 
				
					// JQM territory;
					
					
				}
				// unblock again
				self.options.$blockMultiPbc = false;


		},
		
		/**
		   * name: 	      	  panelDeepLink
		   * called from: 	  wrapper pagebeforeshow
		   * purpose: 		  handles deeplinks to panel pages
		   * ADD EXTERNAL DEEPLINKS VIA SITEMAP
		   */
		panelDeepLink: function () {
						
			// if JQM provides a "pageFirstLoad" event, this would not be necessary						
			var self = this,				
				$deepPage = $( $('html').data("deep") ),
				$deepPanel = $deepPage.closest('div:jqmData(role="panel")'),
				$deepPanelID = $deepPage.closest('div:jqmData(role="panel")').jqmData('id'),
				$deepFrom = $deepPanel.find('div:jqmData(show="first")'),
				$triggerButton;
													
			// deeplink on popover
			if ( $deepPanel.jqmData("panel") == "popover" ) {	
				$triggerButton = $('div:jqmData(wrapper="true")').find('.toggle_popover:jqmData(panel="'+$deepPanelID+'")');
				}
									
			// don't enhance first page on panel with deeplink page
			if ($deepFrom.attr('id') != $deepPage.attr('id') ) { 								
				$deepFrom.removeClass('ui-page-active');
				}	
		
				
			// this needs a timeout, otherwise popovers will be closed
			// before opening by the last loading scrollTop (not sure, 
			// window.setTimeout(function(){																
				if ($triggerButton && !$deepPanel.is(':visible') ) {					
					$triggerButton.trigger('click'); 
					}
				// }, 500);
			
				// load deeplink page
				$.mobile.changePage($deepPage, {fromPage:$deepFrom, transition:"slide", reverse:true, changeHash:false, pageContainer:$deepPanel});
				
			// set
			self.panelHeight()
			
			// clean up deeplink
			$('html').removeData("deep");
			
			},

		
/** -------------------------------------- EVENT BINDINGS -------------------------------------- **/

		/**
		   * name: 	      	  _mainEventBindings
		   * called from: 	  once from create
		   * purpose: 		  single place for all bindings (more or less...)		   
		   */
		_mainEventBindings: function () {
			
			var self = this;
			
			/**
			  * bind to:	vmouseover
		      * purpose: 	supposedly increases scroll performance of lists in iOS? 
			  *				https://forum.jquery.com/topic/solution-in-search-of-the-root-problem
		      */
			$(document).bind("vmouseover", function () {});
			
            /**
			  * bind to:	vclick.crumbs, a.ui-crumbs'
		      * purpose: 	on vlick store crumbs ID and panel to redirect in hashChange!
		      */
			$(document).on('vclick.crumbs', 'a.ui-crumbs', function (e, data ) {														
				var that = $(this);				
				self.options.$crumbsID = $( that ).attr('href');
				self.options.$crumbsPanel = $( that ).jqmData('panel');
				});
						
			/**
			  * bind to:	click, a.toggle_popover
		      * purpose: 	show panels - since this button also passes clickrouting, this needs to be reset
		      */
			$(document).on('click','a.toggle_popover', function(e) {																	
				self.showPanel(e, $(this) );
				self.options.$clickInProgress = false;
				});
			
			/**
			  * bind to:	vclick.clickRouting
		      * purpose: 	store stageEvent - need to bind to vclick, because on click it's not possible to 
			  *  			store event/data and retrieve them in pagebeforechange/panelTrans, because by 
			  *				the time click fires, panelTrans has already run...
		      */
			$(document).on("vclick.clickRouting", function( e, data ) { 					
				self.clickRouter( e, data, "vclick" );
				});
			
			/**
			  * bind to:	pagebeforechange
		      * purpose: 	panel transition handler
		      */
			$(document).on( "pagebeforechange", function( e, data ) {				
						
				// when loading an external page, we need to store its data in sitemap array, so it can be retrieved
				// on backwards transitions. Not doing so, will break the page when trying to go back from an external
				// page, because there will be no reference to the correct fromPage in the URL history. 				
				if ( data.options.fromHashChange == false && $.mobile.path.parseUrl( data.toPage ).hash == "") {										
					self.options.siteMap.push( { type: "external", data: data } );
					}
					
				// The following is necessary because JQM in non-pushstate environments loads the first page, if "no to" page is specified
				// in _handleHashChange. Happens when going backwards from the 2nd page visisted to the initial page. In a panel setup this 
				// could be a "Panel X 2nd-page" to "Panel X 1st-page" transition, where JQM just wants to load the first 								
				// history entry (= wrapper-page) altogether. 
				
				// This would be ok in pushstate environments, because pushstate is passing a URL (first entry in urlHistory) and the trailing 
				// hashchange is ignored (ignoreNextHashChange). In non-pushstate environments however, only the "trailing" hashchange fires,
				// which does not include a URL, hence "to" is not defined in _handleHashChange, hence JQM just loads the first page, without.
				// activating the panel page the transition should be made to. 				
				
				// An easy workaround would be to make sure, when loading the first page, that all nested pages first pages are enhanced 
				// and activated, but this did not work.
				
				// The difficult workaround below does the following: it's taking the hashChange object and converts it to a string with the correct 
				// data.toPage specified. The string will trigger a panelHash, which will modify the data.options, so the whole thing passes JQM
				// as a "to" transition.
				
				// = BAD, because "activeIndex" may go negative (-1) and manually upping it to 0 causes endless loops
				// = BAD, because this requires an on/off flag to only allow the first hashChange coming into here to pass into the function
				// AND it requires to count all forward and backwards transitions to determine, when to override the hashChange with the correct URL. 
				
				// The following now works for both pushstate and non-pushstate devices:
				
				// only first may pass (string in pushstate, object in non-pushstate)
				if ( self.options.$pbcCoutner == 0 ) {
					self.options.$pbcCoutner = 1;						
					
					// if we are going backwards and transition-delta (forward-transitions MINUS backwards-transitions) = 1
					if ( data.options.fromHashChange == true && self.options.$transDelta == 1 ) {
						
						// crawl the history start to end to find the first entry with a page container other than BODY = panel
						for (i = 0; i < $.mobile.urlHistory.stack.length; i++) {							
							if ( $.mobile.urlHistory.stack[i].pageContainer.get(0).tagName != 'BODY') {	
								
								// grab this pageContainers page with data-show="first" = we need to go to this page instead of reloading the wrapper!
								var fix = $.mobile.urlHistory.stack[i].pageContainer.find('div:jqmData(show="first")').attr('id');
								// alert("last one, passing "+fix);																
								
								// an id will never be an URL... 
								data.toPage = '#'+fix;														
								break;
								}							
							}
						// this will now pass the data.toPage of the hashChange OBJECT as a STRING to panelHash triggering the correct transition!
						} 
				}
				
				// block trailing hashchange (objects)
				// TODO: switch to JQM ignoreNextHashChange - previous ignoreMyOwnNextHashChange
				if (typeof data.toPage !== 'string') {		
					return;						
					}	
					
				if ( data.options.fromHashChange == true ) {											
					// only one may pass				
					if ( self.options.$blockMultiPbc == false ) {
						self.options.$blockMultiPbc = true;
						// backwards transitio
						self.panelHash( e, data );
						}
					} else {		
						// forward transition
						self.panelTrans( e, data );
						}					
					
						
				});

			/**
			  * bind to:	hashchange
		      * purpose: 	blocking multiple clicks on Android back button
		      */			  
			$(window).on('hashchange', function(e, data) {
				if ( self.options.$blockMultiClick == false ) {
					self.options.$blockMultiClick = true;
					}				
				});
			
			/**
			  * bind to:	blur, inputs
		      * purpose: 	make sure header is at css:top 0 when closing keyboard in iOS
		      */			
			$(document).on("blur","div:jqmData(wrapper='true') input", function () {
				$(".ui-header-fixed, .ui-element-fixed-top" ).css("top","0 !important");
				});
			
			/**
			  * bind to:	pagebeforeshow, page
		      * purpose: 	plugin setup / panel back buttons
		      */
			$(document).on('pagebeforeshow', 'div:jqmData(role="page")', function(event, data){																	
			
				var page = $(this);
								
				if ( page.jqmData('wrapper') == true ) {	
					
					// make sure visible panels have an active first-page on backwards transitions
					if ( page.find('.ui-panel[status="visible"] .ui-page-active').length == 0 ) { 
						page.find('div:jqmData(show="first")').addClass('ui-page-active');
						}
					
					// fire deeplink
					if ( $('html').data("deep") && page.find( $('html').data("deep")+"" ).length >= 1  ) {																														
						self.panelDeepLink();
						}
					
					// run setup for wrapper ONCE
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
						// we let this fire with every changePage, the firstpage 
						// will never loose active-page and thus always be visible
						// Omitting this call, the 2nd wrapper page loaded into 
						// the DOM will not get the plugin setup and be blank.
						
						// What this does: The counter for the first wrapper page
						// is set to 0 on plugin-init so it runs through here once,
						// gets changed to 1 and thus is blocked from going through
						// again. If a new wrapper is loaded it doesn't have any 
						// counter, so we are also letting "undefined" pass and then set 
						// the counter for this wrapper to 1, so on the next changePage,  
						// pageshow will fire on the wrapper page, but as counter is now 
						// 1, it will not run through here. 						
						var inc = 1;
						page.data("counter", 0+inc);
						} 
											
					// as it's a wrapper page we don't need back buttons on it, so stop here
					event.preventDefault();
					
					// back button
					} else if ( page.closest('div:jqmData(role="panel")').jqmData('hash') && page.jqmData("show") != "first" ){	
							
							// set panelHeight
							self.panelHeight();
						
							// fires crumble every time a page is shown							
							// window.setTimeout(function() {								
								self.crumble(event, data, page );
							//	}, 50);
						} 
				});
			
			/**
			  * bind to:	pagebeforeshow, page
		      * purpose: 	set panelWidth - need to wait until any transition is done, otherwise external pages will not get a width makeover
		      */
			$(document).on("pagebeforeshow", 'div:jqmData(role="page")', function(e){
				window.setTimeout(function(){				
					self.panelWidth( false,"external back&forth");
					},400);
				});		
			
			/**
			  * bind to:	orientationchange
		      * purpose: 	fire splitviewCheck on orientationchange (and resize)
		      */						
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
			$(this).data("counter",0);
			$(this).multiview();
			$('html').data("lockup","locked");
		}
	});

}) (jQuery,this);


/** -------------------------------------- OVERTHROW -------------------------------------- **/

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

