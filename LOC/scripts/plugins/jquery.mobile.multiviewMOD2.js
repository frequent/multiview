/*
* jquery.mobile.multiview v1
* Copyright (c) 2011, Sven Franck, www.franckreich.de
* Dual licensed under the MIT and GPL Version 2 licenses.
* 
* Date: _ - Version: _
*
* based on 
* splitview plugin by CS - http://asyraf9.github.com/jquery-mobile/
* iPad popover by Cagintranet - http://www.cagintranet.com/archive/create-an-ipad-like-dropdown-popover/
*/

/* ATTENTION: this plugin requires either the modified JQM.min.js version or adding the multiview-pre.js file BEFORE JQM.min.js */

/* functions */
/*
 * _create            setup and run basic functions on init
 * _setupSplitview    enhance first pages, fire splitview functions
 * _setupPopovers     setup/hide/show popovers (including menu in popover-mode), adjust content-height in fullscreen-mode
 * crumble            fake back-button on all panels	
 * replaceBackBtn	  replaces back buttons inserted in popover mode
 * splitviewOnClick   check for splitview whenever something is clicked, clear splitview formatting
 * splitscreen        check screen dimensions, manage splitview and popover mode, fire back-btn and crumble
 * context            load page in panel A if changing page in panel B
 * scrollMe           initialize scrollview
 * findClosestLink    [helper] same as JQM
 * getClosestBaseURL  [helper] same as JQM
 * removeActiveLink   [helper] same as JQM
 * gulliver           manage screen mode Small, Medium, Large, Supersize. Small = fullscreen mode
 * checkWidth         manage width of content (cause of 15px padding and content min-height)
 * heightened         [not used currently]
 * framer             [helper] get screen mode
 * expandHeight       [helper] set page height in fullscreen mode
 * stackUp			  add entries into panel-history-stacks
 * panelTransition    handles all transition with specified targetContainer
 * panelHash		  handles panel history on backward transitions
 * _mainEvents        event bindings for the plugin
 *
 */

// TODOS:		
		
		// change to flexible trigger class, not use .type-home
		// silentScroll(top) when opening a popover!	
		// make all vars global		
		// deeplinks not working
		// position popover triangel relative to window or toggle button?	
		// integrate orientationchange
		// add border-right
		// find out why IE8 works (except fixed footer) and IE7 breaks...
		// put history stack handler in here by preventDefault on event.binding+condition
		// make bottom-spacing on fixed-element-bottom a user settable option
		// remove scrollTop blockers again from promise()
		// add popup() effect in fullscreen mode
		// hide popovers on scrollstart of background without hiding them on scrollTop-firing-on transitions inside panel
		// check if stackup entry order for main/menu is responsible for backward transition in data-context handler firing at the same time
		// reset URL path to main/fullwidth data-show="first" on hideAllPanels()
		// find out why page lock is white-screen and misplaced loader if changepaging in popover at scrolldown-position
		// make triangle show up on every page, not only the first time the panel is initiated
		// find out why transitions are slow
		// rework page-height setting. Is off by footer-height on regular JQM pages, may also have to do with JQM handling of footers? shouldn't!
		
		

(function($,window){
	$.widget("mobile.multiview",$.mobile.widget, {
		vars: {
			$html : $('html'),		
			$main : $("div:jqmData(panel='main')"),
			$menu : $("div:jqmData(panel='menu')"),
			$head : $("head"),
			$panel : $("div:jqmData(role='panel')"),
			$popover : $("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')")					

		},

		_create: function() {		
			var self = this;

			// add support touch class
			if($.support.touch){
				self.vars.$html.addClass('touch');
				}
			
			// add multiview classes
			self.vars.$html.addClass('multiview');							
			self.vars.$panel.addClass('ui-mobile-viewport ui-panel');			

			// add global header/footer classes
			if ( $('.type-home :jqmData(role="panel")').length ) {
				$('.type-home').children(':jqmData(role="header")').addClass('ui-header-global');
				$('.type-home').children(':jqmData(role="footer")').addClass('ui-footer-global');
				}			
			
			// default set history to off
			$('div:jqmData(hash="history")').data("history","off");
			
			// init panel history, pagecreate seems to work on panels, too... maybe because of page with data-show="first" inside panel
			$(':jqmData(hash="history")').live('pagecreate', function() {				
				// console.log( "history initiated for: "+$(this).jqmData('id')+" data ..."+$(this).data("history"));
				// this should only fire if history is off or undefined. If you start from a multiview page, all data-hash="history" panels' stacks are initiated
				// they stay active until this page is dropped from the DOM. If you go back, then they are re-initiated again.
				// if the respective page is the first page in the DOM, the history simply stays active, so "going" to another page and coming back does not 
				// trigger a history-stack re-initialization
				if ( $(this).data("history") == "off" || typeof $(this).data("history") == 'undefined' ) {					
					$(this).data("history", "on");	
					//console.log( "history initiated for: "+$(this).jqmData('id')+" data now..."+$(this).data("history"));
					$(this).data("stack", []);
					$(this).data("stack").push('#'+$(this).find(':jqmData(show="first")').attr('id'));							
					}
				});
			
			// setup
			self._setupSplitview();
			self._setupPopovers();
			self._mainEventBindings();						
		},

		_setupSplitview: function() {
		
			var self = this;
			
			if( !$.mobile.hashListeningEnabled || !$.mobile.path.stripHash( location.hash ) ) {			
			// need to setup splitview like this to ensure it fires when the page is loaded directly OR pulled into the DOM of an already existing page
			$( 'div:jqmData(role="page")' ).live( 'pagebeforeshow',function(event){

					$(this).find(':jqmData(role="page")').attr('data-internal-page', 'true');

					// TODO - multiview triggers on page?
					if ( $( event.target ).hasClass("type-home") ) {
					//if ( $( event.target ).attr('id') == "type-home") {
						
						//enhance firsties
						var firstPage=$('div:jqmData(role="panel") > div:jqmData(show="first")').addClass('ui-page '+$.mobile.activePageClass).page();												
						
						// fire splitview and screen modifications
						self.gulliver();
						self.splitScreen("from trigger");
						self.checkWidth();
						} else {
							// just make the page expand to the bottom of the screen
							self.gulliver();
							self.checkWidth();						
						}
					});
				}
			},

		_setupPopovers: function() {
			var self = this;
			
			//setup popovers
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')").each(function(index) {
				$(this).attr('status','hidden');
				// TODO: left/right also possible?
				if($(this).hasClass('ui-triangle-bottom')) {					
					$(this).append('<div class="popover_triangle"></div>');
					} else if ($(this).hasClass('ui-triangle-top')) {
						$(this).prepend('<div class="popover_triangle"></div>');
						}	
				});
				
			// close popovers
			$('.closePanel').live('click', function () {				
				hideAllPanels();
				});
			/*
			// hide on scrollStart
			$('div:jqmData(panel="main"), div:jqmData(panel="menu"), div:jqmData(panel="fullwidth")').bind('scrollstart', function() {				
				hideAllPanels();
				});
			
			// also on desktop
			$(document).scroll(function(){
				hideAllPanels();
				});
			
			 */
			// hide on click tap on body
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('click tap', function(event) {
				if (!$(event.target).closest('.ui-popover').length && !$(event.target).closest('.toggle_popover').length) {					
					$(".ui-popover").stop(true, true).hide();
					$('.toggle_popover').removeClass($.mobile.activeBtnClass);
				};
			  });

			// hide on pageChange
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('pagebeforehide', function(event) {				
				hideAllPanels();
				});

			// hide on click of link in panel, which leads to another panel
			$('a:jqmData(target="main"), a:jqmData(target="fullwidthWithPops")').bind('click', function () {				
				hideAllPanels();
				});

			//$('div:jqmData(panel="popover") div:jqmData(role="page")').live('pagebeforehide', function(event) {
				// retain active class on popovers
				//});

			function hideAllPanels () {
				$('.toggle_popover').removeClass('ui-btn-active');
				// remove all expandHeight() formatting
				$('.ui-expand').css({'height':'','overflow-y':'auto'});
				var $panels = $('.ui-fullscreen-mode div:jqmData(panel="main"), .ui-fullscreen-mode div:jqmData(panel="fullwidth")');
				$panels.find('.ui-page-active div:jqmData(role="header")').attr('data-position','fixed')
																		.addClass('ui-header-fixed ui-fixed-overlay')
																		.css({'visibility':'visible'});
																											   
				// This works, if I use self.vars.$popovers doesn't work... always missing 1 element... 
				$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')").each(function(index) {
					if( $(this).attr('status') == 'visible' ) {
						$(this).attr('status', 'hidden')
								.fadeToggle('fast')
								.removeClass('ui-panel-active')
								.find("div:jqmData(role='page')")
									.not(":jqmData(show='first')")
									.removeClass('ui-page-active')
								.find("div:jqmData(role='page') .ui-btn-active")
									.removeClass('ui-btn-active');

						// clear history of active (= visible) popovers. Menu only included in popover-mode!
						var i = $(this).data("stack").length;						
						while (i>1) {
							 i = i-1;
							 $(this).data("stack").pop();
							}
							
						// reset panel to data-show="first" page, otherwise you get a blank-panel when panel is re-opened
						$(this).find(':jqmData(show="first")').addClass('ui-page-active');
						}
					});
				}
			
			$('.toggle_popover').live('click', function(event) {
				
				// NOT ACTIVE/OPTION - allow to hide/show menu in splitview mode, too
				if($(this).jqmData('panel') == "menu" && $('html').hasClass('switchable')) {
					if ($(this).hasClass('ui-btn-active') ) {
						$('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")').css({'margin-left':'25%','width':'75%'});
						} else {
							$('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")').css({'margin-left':'0px','width':'auto'});
							}
						}

				// show/hide toggle
				var $correspond = $(this).jqmData("panel"),
					$popPanel = $('div:jqmData(id="'+$correspond+'")');	
				
				if ( $popPanel.attr('status') == 'visible' ) {
					hideAllPanels();
					} else {
						hideAllPanels();

					    $popPanel.attr('status', 'visible')	
								 .fadeToggle('fast')
								 .addClass('ui-panel-active')
									.find('div:jqmData(show="first")')
									.addClass('ui-page-active');
						$(this).addClass('ui-btn-active');												
						}				
					
				// tweak content height in fullscreen mode
				self.expandHeight($popPanel.find('.ui-page-active'), "toggle");
				
				var $panels = $('.ui-fullscreen-mode div:jqmData(panel="main"), .ui-fullscreen-mode div:jqmData(panel="fullwidth")');
				$panels.find('.ui-page-active div:jqmData(role="header")').removeAttr('data-position')
																			.removeClass('ui-header-fixed ui-fixed-overlay')
																			.css({'visibility':'hidden'});
				});				
			},			
			
		crumble: function(event, data, page) {			
				
				var $prevPage,
					onPage = $( '#'+page.attr('id') ),
					$crumPanel = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")'),
					$header = onPage.find('div:jqmData(role="header")'),
					$leftBtn = onPage.find('div:jqmData(role="header") .ui-btn-left'),					
					$backUp = $crumPanel.data("stack").length;

				// if the -1 last entry on the history stack of the panel, the page to be loaded is on is not "yield" (it's a transition inside the panel), 
				// take the -1 last entry as previous page
				// if it is "yield" (panel to panel transition), the previous page is the last entry in the target panel history stack that is NOT(!) yield
				// as main/menu stacks increase together with the one not loading a new page getting a "yield" entry.				
				// example:  menu-stack = #menuPage, #menuSub1, #menuSubSub1 and main-stack = #mainPage, yield, yield
				// -1 back on menu = go to #menuSub1, -1 on main = goto #mainPage
				if ( $crumPanel.data("stack")[$backUp-1] != "yield" ) {
					$prevPage = $crumPanel.data("stack")[$backUp-1];
					} else {
						$crumPanel.data("stack").reverse().some(function( elem ) { return ($prevPage = elem) !== "yield" })
						}					
								
				// data-hash="crumbs"
				// separate this into data-hash="crumbs" and data-hasn="history"?
				if( $crumPanel.data('hash') == 'history' ){
							
					// if panel stack is > 1 it has a history, add button, but not on first page of panel!
					if ( $backUp > 0 && onPage.jqmData("show") != "first") {
						// add button																	
						var prevText = $( $prevPage ).find(':jqmData(role="header") .ui-title').html();
						crumbify( $leftBtn, $prevPage, prevText, onPage );										
							} else if ( $backUp = 0) {
								// panel has no history, remove any back button 
								$leftBtn.remove();									
								} 							
						}

			  function crumbify(button, href, text, page){				 				
					
					var targetID = $( '#'+page.attr('id') ).closest(':jqmData(role="panel")').jqmData("id");
					
					// no button - create one													
					if(!button.length) {
							
							page.find('div:jqmData(role="header")').prepend('<a class="bareIcon ui-crumbs ui-btn-left" data-icon="arrow-l"></a>');														
							
							button=$header.children('.ui-crumbs').buttonMarkup();
							button.removeAttr('data-rel')
								    .jqmData('direction','reverse')
								    .attr({'href':'#'+href,
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
								button.replaceWith('<div class="headLogg headerMenuLeft iconposSwitcher-div ui-corner-all ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="bareIcon ui-crumbs ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-left" data-target="'+targetID+'" data-iconpos="left" data-inline="true" data-icon="arrow-l" data-role="button" href="#'+href+'" data-theme="a"><span class="ui-btn-inner ui-corner-left ui-controlgroup-last"><span class="ui-btn-text">'+text+'</span><span class="ui-icon ui-icon-left ui-icon-shadow"></span></span></a><a class="toggle_popover ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-panel="menu" data-iconpos="left" data-inline="true" data-icon="'+$currentIcon+'" data-role="button" href="'+$currentTarget+'" rel="'+$currentRel+'" title="'+$currentTitle+'" data-theme="a"><span class="ui-btn-inner ui-corner-right"><span class="ui-btn-text">'+$currentText+'</span><span class="ui-icon ui-icon-stokkers ui-icon-shadow"></span></span></a></div>');
							}
				}
			}, 
			
		splitviewOnClick: function (event) {			
			var self = this;
			
			// check if a link was clicked
			var link = self.findClosestLink(event.target);
				if (!link) {					
					return;
					} 	
			
			var $link = $(link),				
			httpCleanup = function(){
				window.setTimeout( function() { removeActiveLinkClass( true ); }, 200 );
				};	
				
			
			if ($link.attr('href') == '#') {
					event.preventDefault();
					return;
					}
					
			// no-close on clicking collapsibles											
			if ($link.hasClass('ui-collapsible-heading-toggle')) {						
				return;
				}
	
			// start cleanup if link has no data-target && if data-multiview is not specified on $links from external pages
			// data-multiview is needed, because if an external page is pulled via Ajax, I only have href (page2.html) and 
			// cannot check for trigger-page-id type-home, because I cannot access the page elements of the page I'm loading
			// before it is loaded. Or can I?
			if (typeof $link.jqmData('target') == 'undefined' && !$link.jqmData('multiview') ) {
			
				//wait a little, then clear all splitview/popover formatting 
				window.setTimeout( function() {
					$('html').removeClass('ui-splitview-active ui-splitview-mode ui-popover-mode switchable');
					$('div:jqmData(panel="main")').removeClass( 'ui-panel-left ui-panel-right ui-border-right');
					$('div:jqmData(panel="menu")').addClass('menuHide').removeClass('ui-panel-active');	
	
					// clear both main and menu history
					// TODO: not sexy... 
					self.vars.$panel.each(function(index) {
						if ( typeof $(this).data("stack") != 'undefined' ) {
							var i = $(this).data("stack").length;						
							while (i>1) {
								 i = i-1;
								 $(this).data("stack").pop();
								}						
							}
						});		
	
					// clear menu buttons from popover mode							
					self.replaceBackBtn();
				
					// expand main to full width; NO NEED, because we load a new page into a new container								
					// $('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")').css({'margin-left':'', 'width':'auto', 'right':'0'});
					}, 400);
					
				} 
			
			},
			
		replaceBackBtn: function() {														
				// TODO: do I need this?
				//if($.mobile.urlHistory.stack.length > 1 && !header.children('a:jqmData(rel="back")').length && header.jqmData('backbtn')!=false){ 
				
				// run through all links in menu with data-panel specified and replace the menu button with the previous button
				$('div:jqmData(panel="main") div:jqmData(role="page")').each(function(index) {
				
						var $header = $(this).find(':jqmData(role=header)'),
							$button = $header.children('a.ui-btn-left:first-child'),
							$oldButton = '<a data-iconpos="notext" data-theme="b" class="ui-home ui-btn-left ui-btn ui-btn-up-b ui-btn-icon-notext ui-btn-corner-all ui-shadow" data-direction="reverse" data-transition="slide" data-icon="home" data-role="button" href="#" title="home"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-text">Home</span><span class="ui-icon ui-icon-home ui-icon-shadow"></span></span></a>';					
						
						// if it's a controlgroup
						if ( $header.find('div:first-child').hasClass('ui-controlgroup') ) {	
							// make it a single button again
							$header.children('.menuToggle').replaceWith( $oldButton );						
							} else {							
								// if there is only a menu toggle button, this should be removed
								$header.children('.menuToggle').remove();
								}
						});	
				  //}
				},
			
		
			
		splitScreen: function( event ) {	
			
			var self = this;
			var	$window=$(window),
				$menu=$('div:jqmData(id="menu")'),
				$main=$('div:jqmData(id="main")'),
				$mainHeader=$main.find('div.'+$.mobile.activePageClass+'> div:jqmData(role="header")'),
				$window=$(window);
        	
			function popoverBtn(buttonType) {							
				// loop through all main pages
				$('div:jqmData(panel="main") div:jqmData(role="page")').each(function(index) {
					var $header = $(this).find(':jqmData(role=header)'),
						$button = $header.children('a.ui-btn-left:first-child');
					
					if ( $button.length && $header.children('.menuToggle').length == 0 ) {
					// merge existing left button into controlgroup
						var $buttonTarget = $button.attr('href'),
							$buttonIcon = $button.jqmData('icon'),
							$buttonTitle = $button.attr('title'),
							$buttonText = $button.text(),
							$buttonRel = $button.attr('rel');
																										
						$button.replaceWith('<div class="ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle ui-btn ui-btn-inline ui-btn-icon-left ui-btn-corner-all ui-shadow ui-btn-up-b" data-type="horizontal" data-role="controlgroup"><a class="ui-controlgroup-btn-notext ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-notext ui-corner-left" data-iconpos="notext" data-inline="true" data-icon="'+$buttonIcon+'" data-role="button" href="'+$buttonTarget+'" rel="'+$buttonRel+'" title="'+$buttonTitle+'" data-theme="b"><span class="ui-btn-inner ui-corner-left"><span class="ui-btn-text">'+$buttonText+'</span><span class="ui-icon ui-icon-stokkers ui-icon-shadow"></span></span></a><a class="popover-btn toggle_popover ui-controlgroup-btn-left ui-btn ui-btn-up-b ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-iconpos="left" data-inline="true" data-panel="menu" data-icon="menu" data-role="button" href="#" data-theme="b"><span class="ui-btn-inner ui-corner-right ui-controlgroup-last"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></a></div>');	
						
						// or insert plain menu button if no button exists
						} else {
							
							//if ( $header.children('.menuToggle').length == 0 ) {								
								$header.prepend('<a data-iconpos="left" data-inline="true" data-icon="menu" data-role="button" href="#" data-theme="a" class="ui-btn-up-a ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle" data-panel="menu"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-corner-all"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></span></a>');												
								//}						
							}
						
					});
						
					if (buttonType == "switchable") {
						$('html').addClass('switchable');						
					}
				}

			

			function popover() {
				
				if ( self.vars.$html.hasClass('ui-popover-mode') ) {
					
					return;
					}
			
				var $menu=$('div:jqmData(id="menu")'),
					$main=$('div:jqmData(id="main")'),
					$popover=$('div:jqmData(panel="popover")'),
					$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');			
				
				$menu.addClass('pop_height pop_menuBox ui-triangle-top ui-panel-hidden ui-panel-active ui-element-fixed-top')
						.removeClass('menuHide ui-panel-left')
						.attr('status','hidden')
						.css({'width':'25%', 'min-width':'250px', 'display':'none'});							
					
				$('html').addClass('ui-splitview-active ui-popover-mode').removeClass('ui-splitview-mode');
												
				if($menu.hasClass('ui-triangle-top') ){					
					$menu.prepend('<div class="popover_triangle"></div>');
					}
				$main.removeClass('ui-panel-right')
						.css('width', '')
						.addClass('ui-panel-active');
										
				// only add ui-popover, if we are not in fullscreen mode, otherwise conflicting CSS	
				// TODO: think about relocating this to gulliver, because requires to change all popovers, too!
				if( !$('html').hasClass('ui-fullscreen-mode') ) {					
					$allPanels.addClass('ui-popover').removeClass('pop_fullscreen');					
					} else {	
						$allPanels.addClass('pop_fullscreen').removeClass('ui-popover');						
						}									
				popoverBtn("plain");				
				}
		
			
			function splitView () {
				
				if ( self.vars.$html.hasClass('ui-splitview-mode') ) {					
					return;
					}
				
				var $menu=$('div:jqmData(id="menu")'),
					$main=$('div:jqmData(id="main")'),
					$both=$('div:jqmData(id="menu"), div:jqmData(id="main")'),
					$popover=$('div:jqmData(panel="popover")');										
				$menu.removeClass('ui-popover menuHide pop_height pop_menuBox ui-triangle-top ui-panel-visible ui-element-fixed-top')
						.addClass('ui-panel-left ui-panel-active')
						.removeAttr('status')
						.css({'width':'25%', 'min-width':'250px', 'display':''});				
				$menu.children('.popover_triangle').remove();				
				$menu.find('div:jqmData(show="first") .closePanel').remove();
				$main.addClass('ui-panel-right ui-panel-active');							
				$popover.removeClass('pop_fullscreen').addClass('ui-popover');							
												
				$('html').addClass('ui-splitview-active ui-splitview-mode').removeClass('ui-popover-mode');						
								
				// two options
				self.replaceBackBtn();	
				//popoverBtn("switchable");
				
			}

			// TODO: check if page.height < height of longest panel, if yes go to fullscreen/popover mode
			if(event) {				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > 768)  {												
						splitView();
						} else {
							// preferred						
							popover();
							}					 
					}
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > 768) {	
						//preferred		
						
						splitView();						
						} else {							
							popover();
							}
						// click, resize, init events
						} else if ($window.width() < 768){							
							popover();
							}
							else if ($window.width() > 768) {									
								splitView();
								}		
				}	
			}, 
			
		context: function( object ) {	
		
				var self = this;
				// data-context handler - a page with a link that has a data-context attribute will load that page after this page loads				
				// original only allowed for menu<>main panel context loading. By adding data-context-panel attribute this is now more flexible
				// TODO: does this need a refresh option?
				var $context = object;
				
				// changePage
				$.mobile.changePage( $( $context.jqmData('context') ), { transition:'slide', changeHash:false, fromHashChange: false, pageContainer: $( $context.jqmData('context-panel') ) });															
							
				// TODO: I hoped this would fire with the regular pageChange-binding in mainEvents
				// but it does not. Need to fake event and data...
				// create fake objects
				var fakeEvent = {},
					fakeData = {};

				// assign fake attributes needed to add panel history entries
				fakeEvent.target = $( 'div:jqmData(id="'+$context.jqmData("context-panel")+'")' );				
				fakeData.toPage = $( $context.jqmData('context') );		
					
				// add panel history entry for context transition
				self.stackUp(fakeEvent, fakeData);
				
			},
		
		 				
		
		scrollMe: function ( pageToBeScrolled ) {	
				
					// page selector
					var $page = pageToBeScrolled.find('div:jqmData(role="page")');
												
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
		
		removeActiveLinkClass: function( forceRemoval ) {		
			if( !!$activeClickedLink && ( !$activeClickedLink.closest( '.ui-page-active' ).length || forceRemoval ) ) {		
				$activeClickedLink.removeClass( $.mobile.activeBtnClass );
				}		
			$activeClickedLink = null;
			},
			
			
		gulliver: function() {
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');				
						
			// small = fullscreen
			if ( self.framer() == "small") {					
												
				$('html').addClass('ui-fullscreen-mode');				
				$allPanels.removeClass('ui-triangle-top ui-popover ui-popover-embedded').addClass('pop_fullscreen');
				$allPanels.find('.popover_triangle').remove();
										
				// .iconposSwitcher - remove text on buttons in header to save space
				$(".iconposSwitcher-div a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');																																												
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');																																												
				
				// turn popups into JQM dialogs
				$('.toggle_popover').attr('data-rel','dialog');
				
				// pull on top
				// $allPanels.find('div:jqmData(role="header"), div:jqmData(role="content")').css({'z-index':'1001'});							
				
				

				
				} else {			
					
					// "middle" and "large" together for now
					// TODO beware of splitview or popover mode...
					$('html').removeClass('ui-fullscreen-mode');
					
					}
					
			// initialize scrollview - only on touch devices MENU and POPOVERS, if not in fullscreen mode. 
			// other scenarios handled by device scrolling or desktop scrollbars
			if ( $("html").hasClass('ui-fullscreen-mode') == false && $("html").hasClass('touch') ) {				
				if ( $allPanels.data('scrollable', 'Off') ) {
					$allPanels.data('scrollable', 'On');
					self.scrollMe( $allPanels );
					}
				} 					
			

			$allPanels.each(function(index) {	
				// only fire if no back button exists, as this fires on resize, too...
				if ( $(this).find('.back_popover').length == 0 ) {
				
					// all panels' first pages' close-button
					var $closeFirstPage = ( $(this).hasClass('pop_fullscreen') ) ? 'back' : 'close',
						$closeIcon = ( $(this).hasClass('pop_fullscreen') ) ? 'data-icon="arrow-l"' : 'data-icon="back"'
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="b" class="bareIcon back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
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
			var self = this;		
			// adjusts width of ui-content, because 15px padding somehow always messes things up				
			// 2nd part adjusts page height, so footer is always on the bottom
			if (self.framer() != 'small') {
				
				var $tweakContent = $('div:jqmData(panel="main") div:jqmData(role="content")'),
					$tweakHeader =  $('div:jqmData(panel="main") div:jqmData(role="header")');																								
					
				if ( $('div:jqmData(panel="menu")').width() == '250' ) {
						
					// IMPROVE - override content 15px JQM-CSS
					var $newWidth = $(window).width()-250,
						$oldWidth = $(window).width(),
						$oddPaddingWidth = 30;
						
					// if splitview is active
					if ( $('html').hasClass('ui-splitview-active') ) {
						// and SPLITVIEW MODE, tweak content, make scrollbars visible
						if ( $('html').hasClass('ui-splitview-mode') ) {								
							$tweakContent.css({'margin-left':'250px'}).width( $newWidth-$oddPaddingWidth );
							$tweakHeader.css({'margin-left':'250px'}).width( $newWidth );															
							} else {
								// in POPOVER, undo, make scrollbars visible
								$tweakContent.css({'margin-left':''}).width( $oldWidth-$oddPaddingWidth );
								$tweakHeader.css({ 'margin-left':''}).width( $oldWidth );
								}
							} 																					
						} else {
							// if menu > 250px, it's either splitview on a big display or SMALL mode = fullscreen menu
							if ( $('html').hasClass('ui-splitview-active') ) {	
								if ( $('html').hasClass('ui-splitview-mode') ) {
									// SPLITVIEW MODE, tweak content to make scollbars visible
									var $padding = 30,
									$oddWidth = parseInt( Math.round( $(window).width()*0.75 ) ),
									$odd = $oddWidth-$padding;
									$('div:jqmData(panel="main") div:jqmData(role="content")').css({ 'margin-left':'25%'}).width( $odd );
									$('div:jqmData(panel="main") div:jqmData(role="header")').css({ 'margin-left':'25%', 'width': '75%'});
									} else {
										// POPOVER MODE, fullscreen, undo
										$tweakContent.css({'margin-left':''}).width( $oldWidth-$oddPaddingWidth );
										$tweakHeader.css({ 'margin-left':''}).width( $oldWidth );
										}
							
									}				
							}																			
			
				} // end if framed != small
											
				// set content height across all non popover-pages (popovers handled by newResetActivePageHeight)	
				// TODO: not nice, works by default in JQM. Check how. 
				var $thisPage=$('div:jqmData(role="page")').not('.type-home, div:jqmData(panel="popover") div:jqmData(role="page"), .ui-popover-mode div:jqmData(panel="menu") div:jqmData(role="page")'),				
					$exactContentHeight = self.heightened($thisPage);									
					$thisPage.children(':jqmData(role="content")').css({'min-height': $exactContentHeight});								

					
			}, 
		
		heightened: function (page) {
			
				
				// exact content height	
				// TODO not nice... find solution for menu and main panel, with only main having a "global footer"
				// check how JQM handles this
				$header=page.children(':jqmData(role="header")'),
				$content=page.children(':jqmData(role="content")'),
				$footer=page.children(':jqmData(role="footer")'),
				thisHeaderHeight=$header.css('display') == 'none' ? 0 : $header.outerHeight(),
				thisFooterHeight=$footer.css('display') == 'none' ? 0 : $footer.outerHeight(), //Math.round($footer.innerHeight()/2),    
				thisWindowHeight=window.innerHeight,
				thisContentPadding=parseInt($content.css('padding-top'))+parseInt($content.css('padding-bottom')),

				thisHeight = thisWindowHeight-thisHeaderHeight-thisFooterHeight-thisContentPadding;
				return thisHeight;
				
				
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
		
		
		expandHeight: function (masterPage, action) {
			
			var self = this;			
					
			if ( self.vars.$html.hasClass('ui-fullscreen-mode') ) {				
				if (action == "toggle") {
				
						// popover will be shown = make MAIN page height equal POPOVER page height to enable device scrolling
						var $popHeight = masterPage.find('div:jqmData(role="content")').outerHeight(),

							// make popover height at least window.innerHeight
							$benchMarkHeight = ($popHeight < window.innerHeight) ? window.innerHeight : $popHeight,
							
							// this will be set on main and fullwidth panel active-page content
							$targetPanels = $('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")');		
						
						// set popover to be at least window.innerheight, adjust for padding
						masterPage.find('div:jqmData(role="content")').css({'height': $benchMarkHeight-30});
						
						// set background page to enable scrolling, adjust for padding
						$targetPanels.find('.ui-page-active div:jqmData(role="content")').addClass('ui-expand').css({'height': $benchMarkHeight-30, 'min-height':'50%','overflow-y':'hidden'});									
					} else {
					// pageChange on panel - adjust
				
					}
				} 
			},			
			
		stackUp: function (event, data) {
									
				//TODO: does JQM store the full path or only the #page in history? 				
				var self = this;			
				var $targetPanel = $( event.target ),
					$targetPanelID = $targetPanel.jqmData('id'),					
					$targetPage = '#'+ data.toPage.attr('id');															
				
				/*					
				console.log("targetPanel="+$targetPanel);
				console.log("targetPanelID="+$targetPanelID);
				console.log("targetPage="+$targetPage);
				*/
					
				// if target panel has data-hash="history", add entry to panel stack			
				if ( $targetPanel.jqmData('hash') == 'history' ) {
					// if main or menu is the target both need to be increased. 
					// the targeted panel gets the targetPage as entry, the other one gets a "yield" entry
					
					// as both menu and main can be active in splitview mode, the highest hist.length does not
					// necessarily imply the back transition is on that panel. Therefore main and menu are 
					// increased evenly, and on back transitions, the last entry not being "yield" is used.
					
					// TODO: not sexy... 
					// check if the order entries are made in menu/main affect which transition is reversed in context loading
					if ( $targetPanelID == 'menu' ) {						
						self.vars.$main.data("stack").push("yield");
						self.vars.$menu.data("stack").push($targetPage);						
						} else if ($targetPanelID == 'main') {																	
							self.vars.$menu.data("stack").push("yield");
							self.vars.$main.data("stack").push($targetPage);
							} else { 																			
								$targetPanel.data("stack").push($targetPage);	
								}
					
					}								
			}, 
			
		panelTransition: function (event) {

			// TODO: not sure if relocating this from JQM works all-the-way, so far it does
			
			var self = this,

			/* --------------------------- start JQM copy ------------------------ */
			// functions prepend by $.mobile.
			// TODO: try referencing directly
			
			//existing base tag?
			$base = self.vars.$head.children( "base" ),

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
				// call functions by adding $.mobile.
				// TODO: do I really need all this again here? 
			
				//remove active link class if external (then it won't be there if you come back)
				var httpCleanup = function(){
					window.setTimeout( function() { self.removeActiveLinkClass( true ); }, 200 );
					};		  
							  
				//if there's a data-rel=back attr, go back in history
				if( $link.is( ":jqmData(rel='back')" ) ) {
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
				var isRefresh=$link.jqmData('refresh'),				
					$targetContainer=$('div:jqmData(id="'+$targetPanel+'")'),					
					$targetPanelActivePage=$targetContainer.children('div.'+$.mobile.activePageClass),					
					$currPanel = $link.parents('div:jqmData(role="panel")'),
					$currPanelID = $currPanel.jqmData('id'),
					$currPanelActivePage=$currPanel.children('div.'+$.mobile.activePageClass),
					url=$.mobile.path.stripHash($link.attr("href")),
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
								var from=$currPanelActivePage,
									hashChange = $targetContainer.jqmData('hash') == 'history' ? true : false;
								$.mobile.pageContainer=$currPanel;														
								$.mobile.changePage(href, {fromPage:from, transition:transition, reverse:reverse, changeHash:hashChange, pageContainer:$currPanel});
								// [Asyraf]: active page must always point to the active page in main - for history purposes.														
								// TODO: keep or modify							
								$.mobile.activePage=$('div:jqmData(id="main") > div.'+$.mobile.activePageClass+', div:jqmData(id="fullwidth") > div.'+$.mobile.activePageClass);
								}
				
				
				}
				
		},
		
		panelHash: function( e, triggered, hash ) {

		
		},
		
		_mainEventBindings: function () {
		
			var self = this;
			
			$(document).bind( "click", function( event ) {				
				// splitview routine
				self.splitviewOnClick(event);
				
				var link = $( self.findClosestLink(event.target) );
				
				// panel transition rountine
				if ( link ) {
					self.panelTransition(event);
					}

				// context routine
				if ( link && link.jqmData('context') ) {
					self.context( link );					
					}
				
				});
					
			// panel history 
			// TODO: listening to live/pageshow on nested pages does not work. pagecreate fires too often, NOT NICE			
			$('div:jqmData(role="page")').live('pagecreate.crumbs', function(event, data){							
								
				if ( $(this).hasClass('type-home') ) {				
					// parent page - regular back button, don't interfere
					event.preventDefault();
					} else if ( $(this).closest(':jqmData(role="panel")').jqmData('hash') && $(this).jqmData("show") != "first" ){					
						// fires crumble every time a page is created
						// by checking for a closest panel, we ensure it's not fired on a regular JQM page!						
						self.crumble(event, data, $(this) );						
						}
				});

			// panel history stack adding
			$('div:jqmData(role="page")').bind( "pagechange", function( event, data ) {					
				if(data.options.fromHashChange == false) {
					// don't stack up panels, if changePage was called fromHashChange					
					self.stackUp(event, data);
					}
				});
			
			// hashChange rountine
			/* $(window).bind( "hashchange", function( e, triggered ) {				
				self.panelHash( e, triggered, location.hash );
				});			
			*/
			}	
	});

// initialize
var trigger = $( 'div:jqmData(role="page"):first' ).one( 'pagecreate',function(event){		
	if ($('html').data('multi-init', 'Off')) {
		$('html').data('multi-init', 'On')
		trigger.multiview();
		}
});
	
		
}) (jQuery,this);


