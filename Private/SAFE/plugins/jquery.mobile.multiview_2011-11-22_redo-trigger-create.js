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
 * clearActiveClasses [helper] mimics JQM removeActiveClassLink(), which can't be called from here and doesn't handle panels
 * expandHeight       [helper] set page height in fullscreen mode
 * stackUp			  add entries into panel-history-stacks
 * stackDown		  reduce entries from panel-history-stacks
 * panelTrans  	   	  handles all transition with specified targetContainer
 * panelHash		  handles panel history on backward transitions
 * _mmHandler		  [helper] get determin panel page for backward transition
 * _mainEvents        event bindings for the plugin
 *
 */

// TODOS:		
		// ==== OUT OF REACH ====	
		// blinky footer?		
		// search for whiteout workaround = promise() scrollto blocked, scroll down page, open openover, changePage in popover							
		// change the plugin into a light version = no elements added/removed from DOM = work with what JQM does or user inputs
		// make the plugin workin non-JS=basic HTML mode = format via CSS and changing classes vs. changing css with jquery		
		
		// ==== MISC ==== 
		// make all vars global				
		// make bottom-spacing on fixed-element-bottom a settable option, make options altogether 
		// add 2 more popovers to page5 one fixed-bottom and one midscreen. 		
		// triangel position requires popover overflow-x visible !important. Find another solution to position triangles - triangel is gone in FF...
		// make triangel show up on every page vs. first page only
		// make menu & main into data-connect="true", instead of referencing them by name all the time		
		// override context loading in fullscreen mode, what to show? Menu or Main?				
		// increase menu content min-height to page-height-toolbars, so scrollview runs full page height. Now only content height
		
		// ==== GEN PRIO ====
		// prefetching and form submit need to be checked
		// deeplinks not working, do like this: check for hash=activePage on panel, no hash=check for active-panel-data-show:first		
		// dialogs not working, need pageContainer set correctly like loader!
		// if two multiview pages are in the DOM, need to make sure all routines are only counting the page currently in focus = check for active wrapper		
		// set height of elements in fullscreen mode. Background panels should get height of active popup panel active page on every hide/show/changepage		
		// find out why fixed footer is badly mispositioned on new JQM pages added to DOM (because now 2 pages go into height equation...)
		// footer not hiding on scrollstart
		// footer page4, if externally loaded, sometimes ends up on top, I think because it's not inside toolbar-selector, check why					
		// ui-element-fixed-bottom/top should not SHOW! automatically! HIDE effect is also... re-positioning not toggling, re-do		
		// fixed footer on page5 is not fixed... although it should be...
		// reset URL path to main/fullwidth data-show="first" on hideAllPanels(), changePage to data-show="first"!	
		// rework panel min-height menu/main/fullw to exclude global header/footer height, beware of additional elements inside body with height (pages-only get ui-page-active, dialogs?, loader?)
		// scrollMe bind to pageLoad to ensure new pages also get scrollview
		// scrollstart in fullscreen mode hides fullscreen panel, shouldn't. Panel height is not adapted to background= longest active page on a panel
		// when does splitviewOnClick fire? Does it fire at all???
		// popover and splitview CSS should be set in popover() or splitview() or setupPopovers(), not in...?
		// expanding collapsibles in main does not update menu height and vice verca
		
		// ==== NAV PRIO ====
		// redo back button index to align window.history, $.mobile.history and panel.history... 									
		// panel-cache = loose added pages when traverising away from them...
		// find a way to update URL if page is loaded into panel
		// redo fucking removeActiveClass
		// check what do to with window.historyCounter when panel closes
		// align $.mobile.url.history-activeIndex with windowCounter and panelHistory...
		
(function( $, undefined ) {

$.widget( ".mobile.multiview.page", $.mobile.widget, {
	options: {
		theme: "c",
		domCache: false,
		keepNativeDefault: ":jqmData(role='none'), :jqmData(role='nojs')"
	},

	_create: function() {

		this._trigger( "beforecreate" );

		this.element
			.attr( "tabindex", "0" )
			.addClass( "ui-page ui-body-" + this.options.theme );
	},

	keepNativeSelector: function() {
		var options = this.options,
			keepNativeDefined = options.keepNative && $.trim(options.keepNative);

		if( keepNativeDefined && options.keepNative !== options.keepNativeDefault ){
			return [options.keepNative, options.keepNativeDefault].join(", ");
		}		
		return options.keepNativeDefault;
	}
});
})( jQuery );
		
		
		
		

(function($,window){		
	
	$.widget("mobile.multiview",$.mobile.widget, {
		vars: {
			$html : $('html'),		
			$main : $("div:jqmData(panel='main')"),
			$menu : $("div:jqmData(panel='menu')"),
			$full : $("div:jqmData(panel='fullwidth')"),
			$head : $("head"),
			$panel : $("div:jqmData(role='panel')"),
			$backPanels : $("div:jqmData(panel='main'), div:jqmData(panel='fullwidth')"),
			$popover : $("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')"),
			
			// mimic JQM $ignoreNextHashChange
			$ignoreMyOwnNextHashChange : '',
			
			// block hashChanges originating from data-context
			$contextBlockNextHashChange: '',
			
			// block hashChanges originating from crumbs back-button
			$crumbsBlockStackUp: '',
			
			// block scrollTop on transitions inside a popover
			$panelTransBlockScrollTop:'',
			
			// keep up with window.history
			$windowHistoryCounter:0

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
			
			// needed here, popovers, main/menu will be done by splitview setup
			self.vars.$full.addClass('ui-panel-active');

			// add global header/footer classes
			if ( $('div:jqmData(wrapper="true") div:jqmData(role="panel")').length ) {
				$('div:jqmData(wrapper="true") ').children(':jqmData(role="header")').addClass('ui-header-global');
				$('div:jqmData(wrapper="true") ').children(':jqmData(role="footer")').addClass('ui-footer-global');
				}			
			
			// default set history to off
			$('div:jqmData(hash="history")').data("history","off");
			
			// init panel history, pagecreate seems to work on panels, too... maybe because of page with data-show="first" inside panel
			$(':jqmData(hash="history")').live('pagecreate', function() {								
				// this should only fire if history is off or undefined. If you start from a multiview page, all data-hash="history" panels' stacks are initiated
				// they stay active until this page is dropped from the DOM. If you go back, then they are re-initiated again.
				// if the respective page is the first page in the DOM, the history simply stays active, so "going" to another page and coming back does not 
				// trigger a history-stack re-initialization
				if ( $(this).data("history") == "off" || typeof $(this).data("history") == 'undefined' ) {					
					$(this).data("history", "on");						
					$(this).data("stack", []);
					$(this).data("stack").push('#'+$(this).find(':jqmData(show="first")').attr('id'));							
					// this is necessary, if I run panelHash from here vs. JQM					
					self.vars.$ignoreMyOwnNextHashChange = false;					
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
			
				// need to setup splitview like this to ensure it fires when the page is loaded  
				// directly or being pulled into the DOM of an already existing page
				$( 'div:jqmData(role="page")' ).live( 'pagebeforeshow',function(event){
					
					// if it's the multiview page
					if ( $(this).jqmData('wrapper') ) {					
														
						// assign internal-page attribute to all container pages
						// needed for panel-cache, to drop pages which have been 
						// added to a pageContainer when leaving them
						$(this).find(':jqmData(role="page")').attr('data-internal-page', 'true');

						//enhance first pages on all panels		
						// TODO: trigger('enhance'), doesn't work on pages, this is manual, but only on page-level
						// other stuff missing: 
						var firstPage= $('div:jqmData(role="panel") > div:jqmData(show="first")');
						
						firstPage.each(function() {
							// var pageTheme = firstPage.jqmData("theme");
							// $(this).page()
							
							
								/*.trigger('create').addClass('ui-page ui-page-active ui-body-'+pageTheme).attr('tabindex','0')
								.find('.ui-header-fixed').addClass('ui-fixed-overlay').addClass('ui-fixed-inline');
								
								// fake til they make it...								
								$(this).data("page", $(this) );
								
								var page = {};
									page.element = $(this).data("page");
									page.options = { 'keepNativeDefault':":jqmData(role='none'), :jqmData(role='nojs')", 'theme':'c','domCache':false };
								var options = page.options;
								
								
								
								console.log( page);
								console.log( options );
							*/
							});
		
						
						
						
						// fire splitview and screen modifications
						self.gulliver();
						self.splitScreen("from trigger");
						self.checkWidth();
						} else {
							// on fullwidth and regular pages, just run the layout routines
							self.gulliver();
							self.checkWidth();						
						}
					});
				}
			},
		
		// setup, toggling popovers
		_setupPopovers: function() {
			
			var self = this;
			
			// setup
			// TODO: check historyCounter when popovers close! 
			$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')").each( function(index) {
				$(this).attr('status','hidden');
				
				// triangles
				// TODO: left/right also possible? - not visible on FF after switching from 1.0RC3 to 1.0
				if($(this).hasClass('ui-triangle-bottom')) {					
					$(this).append('<div class="popover_triangle"></div>');
					} else if ($(this).hasClass('ui-triangle-top')) {
						$(this).prepend('<div class="popover_triangle"></div>');
						}	
				});
				
			// close popovers - when the following happens
			// (1) click on close button
			$('.closePanel').live('click', function () {								
				hideAllPanels();				
				});			
			
			// (2) scrollStart on main or fullwidth panels
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').bind('scrollstart', function() {							
				hideAllPanels();
				});
			
			// (3) scrollStart on document
			$(document).scroll(function(){
				// only hide if not in fullscreen mode and no blocker set
				// the blocker is necessary if new pages are loaded into DOM, because
				// I cannot find the scrollTop in JQM which fires when new pages are
				// appended to the DOM
				if ( !$('html').is('.ui-fullscreen-mode') && self.vars.$panelTransBlockScrollTop == false ) {										
					hideAllPanels();
					// reset for next;
					self.vars.$panelTransBlockScrollTop == true; 
					}
					
				});
						
			// (4) click or tap on main or fullwidth panel
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('click tap', function(event) {
				if (!$(event.target).closest('.ui-popover').length && !$(event.target).closest('.toggle_popover').length) {															
					hideAllPanels();
				};
			  });

			// (5) changePage on main or fullwidth panel
			$('div:jqmData(panel="main"), div:jqmData(panel="fullwidth")').live('pagebeforehide', function(event) {												
				hideAllPanels();
				});

			// (6) click of a link on a panel, which loads a page on another panel
			$('a').bind('click', function () {								
				if ( $('html').is('.ui-fullscreen-mode') 
					&& $(this).jqmData('target') 
						&& $(this).jqmData('target') != $(this).closest(':jqmData(role="panel")').jqmData('id') ) {														
					hideAllPanels();
					}
				});

			// hidePanels
			function hideAllPanels () {
				
				// clear button active class
				$('.toggle_popover').removeClass('ui-btn-active');
				
				// remove all expandHeight() formatting
				$('.ui-expand').css({'height':'','overflow-y':'auto'});
				var $panels = $('.ui-fullscreen-mode div:jqmData(panel="main"), .ui-fullscreen-mode div:jqmData(panel="fullwidth")');
				$panels.find('.ui-page-active div:jqmData(role="header")').attr('data-position','fixed')
																		.addClass('ui-header-fixed ui-fixed-overlay')
																		.css({'visibility':'visible'});
																											   				
				// run through all panels
				// TOOD: This works, but if I use self.vars.$popovers it doesn't... always missing 1 element... 
				$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')").each(function(index) {		
					if( $(this).attr('status') == 'visible' ) {
						$(this).attr('status', 'hidden')			
								.addClass('reverse out')
								.hide('fast')								
								.removeClass('ui-panel-active')								
								.find("div:jqmData(role='page')")
									.not(":jqmData(show='first')")
									.removeClass('ui-page-active')
								.find("div:jqmData(role='page') .ui-btn-active")
									.removeClass('ui-btn-active');												
						
						// fullscreen handler
						// TODO: move pop() transition in here
						if ( $('html').is('.ui-fullscreen-mode') ) {
							
							//reactivate background pages							
							$('.reActivate').addClass('ui-page-active').removeClass('reActivate');
							}
						
						// clear history of active (= visible) popovers. Menu only included in popover-mode!
						// TOOD: check if the windowHistoryCounter needs to be reset here, too												
						if ( typeof $(this).data("stack") != 'undefined') {
							var i = $(this).data("stack").length;												
							while (i>1) {
								 i = i-1;
								 $(this).data("stack").pop();
								}
							}

						// reset panel to data-show="first" page, otherwise you get a blank-panel when panel is re-opened
						// TODO: update URL, too, otherwise missing a lot, don't want to this with a changePage though...
						$(this).find(':jqmData(show="first")').addClass('ui-page-active');
						}
					});
					// clean up pop() transition
					window.setTimeout( function() {						
						$('div:jqmData(role="panel")').removeClass('reverse out pop');
						}, 350);
					
				}
			
			// show panel routine
			$('.toggle_popover').live('click', function(event) {
				
				var $correspond = $(this).jqmData("panel"),
					$popPanel = $('div:jqmData(id="'+$correspond+'")');	
				
				// NOT ACTIVE - allow to hide/show menu in splitview mode, too
				if($(this).jqmData('panel') == "menu" && $('html').hasClass('switchable')) {
					if ($(this).hasClass('ui-btn-active') ) {
						$('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")')
							.css({'margin-left':'25%','width':'75%'});
						} else {
							$('div:jqmData(panel="main") div:jqmData(role="header"), div:jqmData(panel="main") div:jqmData(role="content")')
								.css({'margin-left':'0px','width':'auto'});
							}
						}
					
				if ( $popPanel.attr('status') == 'visible' ) {					
					// (7) clicking on active popover button closes this popover agin
					hideAllPanels();
					} else {
						// (8) clicking on a not-active trigger button closes all other popovers first
						hideAllPanels();
						
						// calculate center position if center-class is provided						
						if ( $popPanel.hasClass('ui-popover-center') ){							
							$popPanel.css("left", (($(window).width() - $popPanel.outerWidth()) / 2) + $(window).scrollLeft() + "px");
							}

						// opens the new popover
					    $popPanel.attr('status', 'visible')									 
								 .addClass('ui-panel-active pop in')
									.show('fast')										
									.find('div:jqmData(show="first")')
										.addClass('ui-page-active');
						
						// clean up pop transition
						window.setTimeout( function() {							
							$popPanel.removeClass('in');
							}, 350);
							
						// fullscreen handler	
						// TODO: move pop() transition in here
						if ( $('html').is('.ui-fullscreen-mode') ) {														
							//remove all other active pages to make sure popover is visible $popPanel.find('.ui-page-active')	
							//assign a reActivate flag to activate pages again once this panel hides
							$('div:jqmData(role="page").ui-page-active')
								.not( "div:jqmData(multiview='true'), div:jqmData(id='"+$correspond+"') .ui-page-active" )
								.addClass("reActivate")
								.removeClass('ui-page-active');							
							}
												
						$(this).addClass('ui-btn-active');				
						}				
					
				// tweak content height in fullscreen mode				
				self.expandHeight($popPanel.find('.ui-page-active'), "toggle");
				
				// un-fix fixed headers on background pages
				// TODO: still need this with global/local setup?
				var $panels = $('.ui-fullscreen-mode div:jqmData(panel="main"), .ui-fullscreen-mode div:jqmData(panel="fullwidth")');
				$panels.find('.ui-page-active div:jqmData(role="header")').removeAttr('data-position')
																			.removeClass('ui-header-fixed ui-fixed-overlay')
																			.css({'visibility':'hidden'});
				});				
			},

		// back button handling on panel pages
		crumble: function(event, data, page) {
		
				var self = this;
				
				var $prevPage,
					onPage = $( '#'+page.attr('id') ),
					$crumPanel = $( '#'+page.attr('id') ).closest('div:jqmData(role="panel")'),
					$header = onPage.find('div:jqmData(role="header")'),
					$leftBtn = onPage.find('div:jqmData(role="header") .ui-btn-left'),					
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
							
					// if panel stack is > 1 it has a history, add button, unless it's the first page of panel!
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
					// no button - or already existing crumbs button															
					if(!button.length || button.hasClass('ui-crumbs') == true ) {
							
							// clear old button
							button.remove();
							
							// make new one 
							page.find('div:jqmData(role="header")').prepend('<a class="ui-crumbs ui-btn-left" data-icon="arrow-l"></a>');														
							
							button = $header.children('.ui-crumbs').buttonMarkup();
							//button = $header.children('.ui-crumbs').trigger('create');
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
								// TODO: is this better than inserting plain controlgroup and enhanceing it?
								button.replaceWith('<div class="headLogg headerMenuLeft iconposSwitcher-div ui-corner-all ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="ui-crumbs ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-left" data-target="'+targetID+'" data-iconpos="left" data-inline="true" data-icon="arrow-l" data-role="button" href="#'+href+'" data-theme="a"><span class="ui-btn-inner ui-corner-left ui-controlgroup-last"><span class="ui-btn-text">'+text+'</span><span class="ui-icon ui-icon-left ui-icon-shadow"></span></span></a><a class="toggle_popover ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-panel="menu" data-iconpos="left" data-inline="true" data-icon="'+$currentIcon+'" data-role="button" href="'+$currentTarget+'" rel="'+$currentRel+'" title="'+$currentTitle+'" data-theme="a"><span class="ui-btn-inner ui-corner-right"><span class="ui-btn-text">'+$currentText+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a></div>');
							}
				}
			}, 
		
		// splitview routine
		// check for splitview on clicked links
		splitviewOnClick: function (event) {			
			
			var self = this;
			
			// --------------------------- start JQM copy ------------------------ 
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
			
			// --------------------------- end JQM copy ------------------------ 
			
			// start cleanup if the link has no data-target and if data-wrapper is not specified on $links from external pages
			// data-multiview is needed, because if an external page is pulled via Ajax, I only have href (page2.html) and 			
			// before it is loaded. Or can I?
			if (typeof $link.jqmData('target') == 'undefined' && !$link.jqmData('wrapper') ) {
			
				//wait a little, then clear all splitview/popover formatting 
				window.setTimeout( function() {
					$('html').removeClass('ui-multiview-active ui-splitview-mode ui-popover-mode switchable');
					$('div:jqmData(panel="main")').removeClass( 'ui-panel-right ui-border-right');
					$('div:jqmData(panel="menu")').addClass().removeClass('ui-panel-left ui-panel-active ui-panel-border-right');	
	
					// clear both main and menu history
					// TODO: not nice....
					// TODO: check for windowCounter update here, too
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
				
					}, 400);
					
				} 
			
			},
			
		replaceBackBtn: function() {																		
				
				// TODO: this is not very flexible, improve
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
				},
			
		splitScreen: function( event ) {	
			
			var self = this;
			var	$window=$(window),
				$menu=$('div:jqmData(id="menu")'),
				$main=$('div:jqmData(id="main")'),
				$mainHeader=$main.find('div.'+$.mobile.activePageClass+'> div:jqmData(role="header")'),
				$window=$(window);
        	
			// create menu buttons in popover mode
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
																										
						$button.replaceWith('<div class="ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle ui-btn ui-btn-inline ui-btn-icon-left ui-btn-corner-all ui-shadow ui-btn-up-b" data-type="horizontal" data-role="controlgroup"><a class="ui-controlgroup-btn-notext ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-notext ui-corner-left" data-iconpos="notext" data-inline="true" data-icon="'+$buttonIcon+'" data-role="button" href="'+$buttonTarget+'" rel="'+$buttonRel+'" title="'+$buttonTitle+'" data-theme="b"><span class="ui-btn-inner ui-corner-left"><span class="ui-btn-text">'+$buttonText+'</span><span class="ui-icon ui-icon-arrow-l ui-icon-shadow"></span></span></a><a class="popover-btn toggle_popover ui-controlgroup-btn-left ui-btn ui-btn-up-b ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-iconpos="left" data-inline="true" data-panel="menu" data-icon="menu" data-role="button" href="#" data-theme="b"><span class="ui-btn-inner ui-corner-right ui-controlgroup-last"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></a></div>');							
						// or insert plain menu button if no button exists
						} else {
							$header.prepend('<a data-iconpos="left" data-inline="true" data-icon="menu" data-role="button" href="#" data-theme="a" class="ui-btn-up-a ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle" data-panel="menu"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-corner-all"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></span></a>');																			
							}						
					});
						
					// switchable option, this also allows to hide the menu in splitscreen mode					
					// really needed?
					if (buttonType == "switchable") {
						$('html').addClass('switchable');						
					}
				}

			// setup popover mode
			function popover() {				
				if ( self.vars.$html.hasClass('ui-popover-mode') ) {										
					return;
					}
			
				var $menu=$('div:jqmData(id="menu")'),
					$main=$('div:jqmData(id="main")'),
					$popover=$('div:jqmData(panel="popover")'),
					$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');			
				
				$menu.addClass('ui-popover pop_menuBox ui-triangle-top ui-panel-active ui-element-fixed-top')
						.removeClass('ui-panel-left ui-panel-border-right')
						.attr('status','hidden')
						.css({'width':'25%', 'min-width':'250px'});							
					
				$('html').addClass('ui-multiview-active ui-popover-mode').removeClass('ui-splitview-mode');
												
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
		
			// setup splitview mode
			function splitView () {				
				if ( self.vars.$html.hasClass('ui-splitview-mode') ) {					
					return;
					}
				
				var $menu=$('div:jqmData(id="menu")'),
					$main=$('div:jqmData(id="main")'),
					$both=$('div:jqmData(id="menu"), div:jqmData(id="main")'),
					$popover=$('div:jqmData(panel="popover")');										
				$menu.removeClass('ui-popover pop_menuBox ui-triangle-top ui-panel-visible ui-element-fixed-top')
						.addClass('ui-panel-left ui-panel-active ui-panel-border-right')
						.removeAttr('status')
						.css({'width':'25%', 'min-width':'250px', 'display':''});				
				$menu.children('.popover_triangle').remove();				
				$menu.find('div:jqmData(show="first") .closePanel').remove();
				$main.addClass('ui-panel-right ui-panel-active');							
				$popover.removeClass('pop_fullscreen').addClass('ui-popover');							
												
				$('html').addClass('ui-multiview-active ui-splitview-mode').removeClass('ui-popover-mode');						
								
				// two options
				self.replaceBackBtn();	
				//popoverBtn("switchable");
				
			}

			if(event) {				
				// portrait
				if (window.orientation == 0 || window.orientation == 180 ){
					if($window.width() > 768)  {												
						splitView();
						} else {					
							popover();
							}					 
					}
					// landscape
					else if (window.orientation == 90 || window.orientation == -90 ) {
					if($window.width() > 768) {	
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
				
				// block next hashChange transition?
				// self.vars.$contextBlockNextHashChange = true;				
				self.vars.$ignoreMyOwnNextHashChange == false;				
				
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
		// TODO: still needed?, check who is calling this function!
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
				
				$('html').addClass('ui-fullscreen-mode');				
				$allPanels.removeClass('ui-triangle-top ui-triangel-bottom ui-popover-embedded').addClass('pop_fullscreen');
				$allPanels.find('.popover_triangle').remove();
										
				// .iconposSwitcher - remove text on buttons in header to save space
				$(".iconposSwitcher-div a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');
				$(".iconposSwitcher-a").attr('data-iconpos','notext').removeClass('ui-btn-icon-left ui-btn-icon-right').addClass('ui-btn-icon-notext');

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
						$backButton = '<a href="#" data-role="button" '+$closeIcon+' data-inline="true" data-iconpos="left" data-theme="a" class="bareIcon back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
						$firstPage = $(this).find('div:jqmData(show="first")').not('.ui-splitview-mode div:jqmData(panel="menu") div:jqmData(role="page")'),
						$firstPageTheme =$firstPage.jqmData('theme');
						
					//TODO: don't use page()
					// $firstPage.page();					
					$firstPage.trigger('create').addClass('ui-page ui-page-active ui-body-'+$firstPageTheme).attr('tabindex','0')
							.find('div:jqmData(role="header") h1').before($backButton);
					
					// TODO: page() doesn't work
					// $(this).find('div:jqmData(show="first")').page();
					// $(this).find('div:jqmData(show="first")').trigger('create');
					$firstPage.find('.back_popover').buttonMarkup();								
					
					}
				});						
			}, 
			
				
		checkWidth: function( fromWhere ) {
			var self = this;		
			// adjusts width of ui-content, because 15px padding somehow always messes things up				
			// in splitview mode.
			// DON'T TOUCH!
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
			}, 
		/*
		heightened: function (page) {
				
				// TODO not nice... find solution for menu and main panel, with only main having a "global footer"
				// check how JQM handles this
				var $this = page,
					$header = $this.children(':jqmData(role="header")'),
					$content = $this.children(':jqmData(role="content")'),
					$footer = $this.children(':jqmData(role="footer")'),
					thisHeaderHeight = $header.css('display') == 'none' ? 0 : $header.outerHeight(),
					thisFooterHeight = $footer.css('display') == 'none' ? 0 : $footer.outerHeight(),    
					thisWindowHeight = window.innerHeight,
					thisContentPadding = parseInt($content.css('padding-top'))+parseInt($content.css('padding-bottom')),
					thisHeight = thisWindowHeight-thisHeaderHeight-thisFooterHeight-thisContentPadding;			
					
				return thisHeight;
				
				// set height of all panels (excluding popovers) to height of largest panel based on its contents
			
				// grab all panels except popovers
				var $thisPage = typeof page == 'undefined' ? ':jqmData(show="first")' : '.ui-page-active',
					$benchmarkPanels = $(':jqmData(panel="main"), :jqmData(panel="menu"), :jqmData(panel="fullwidth")');
				
					var t = 0,
						pretop = 0,
						s = 0;
										
					// on each	panel
					$($benchmarkPanels).each(function () {						
						
						// run through child-div of relevant page = should be header/content/footer, grab their outerheight and sum up
						$(this).find($thisPage).children('div').each(function () {							
							pretop += $(this).outerHeight();
							});
												
						// find largest panel active-page
						if ( pretop > t ) {
							t = pretop;
							}						
						});
					
					// get height of global header (which itself is positioned at top 0, so doesn't need any attention)
					var s = $('.ui-header-global').outerHeight()+t;
					
					// set panel height to t - otherwise panel-height = 0 and fixed footers are stuck at top of the screen
					$(':jqmData(panel="main"), :jqmData(panel="menu"), :jqmData(panel="fullwidth")').height(s);
					
				
					
				$(window).trigger('updatelayout');
								
			},
		*/
		
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
			
		// panel navigation and panel hash routines
		// adding entries to panel history stacks
		stackUp: function (source, event, data) {			
					
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
						self.vars.$main.data("stack").push("yield");
						self.vars.$menu.data("stack").push($targetPage);						
						} else if ($targetPanelID == 'main') {																								
							self.vars.$menu.data("stack").push("yield");
							self.vars.$main.data("stack").push($targetPage);
							} else { 												
								$targetPanel.data("stack").push($targetPage);	
								}
						
					// prevent $.mobile.urlHistory from increasing
					$.mobile.urlHistory.stack.pop();
					
					// keep count
					++self.vars.$windowHistoryCounter;
					
					//console.log("counter="+self.vars.$windowHistoryCounter);			
					//console.log("===============  panel up  ================");
					//console.log("stackUp pop "+$targetPanel.data("stack") );
					//console.log("stackUp menu "+self.vars.$menu.data('stack') );
					//console.log("stackUp main "+self.vars.$main.data('stack') );					
					
					}
					
			}, 
		
		// reduce panel history stacks
		stackDown: function ( source, whereToGo ) {
			
			var self = this;				
			
			var	$closestPanel = $( '#'+whereToGo).closest(':jqmData(role="panel")'),							
				$closestPanelID = $closestPanel.jqmData('id');
			
			if ( $closestPanelID == "menu" || $closestPanelID == "main") {
					
					self.vars.$main.data('stack').pop();
					self.vars.$menu.data('stack').pop();
											
					} else {					
						$closestPanel.data('stack').pop();					
						}
						
					// prevent $.mobile.urlHistory from increasing
					$.mobile.urlHistory.stack.pop();
					
					// keep score
					++self.vars.$windowHistoryCounter;
					
					//console.log("counter="+self.vars.$windowHistoryCounter);
					//console.log("===============  panel down  ================");	
					//console.log("stackDown pop "+$closestPanel.data("stack") );
					//console.log("stackDown menu "+self.vars.$menu.data('stack') );
					//console.log("stackDown main "+self.vars.$main.data('stack') );	
					
			
		},
		// clear active button classes	
		clearActiveClasses: function ( trigger, useBruteForce, toPage, fromPage, link ) {
				
				// clear active buttons :-)
				if (link) {					
					link.closest('.ui-btn').addClass('ui-clicked-me');
					link.closest(':jqmData(role="page")').find('.ui-btn-active').not('.ui-clicked-me').removeClass('ui-btn-active');
					link.closest('.ui-btn').removeClass('ui-clicked-me');
					}

				// clear active links if to and from page are on the same panel
				if (toPage.closest(':jqmData(role="panel")').jqmData("id") == fromPage.closest(':jqmData(role="panel")').jqmData("id")  ) {												
						// show some color
						window.setTimeout( function() {							
							fromPage.find('.ui-btn').removeClass( $.mobile.activeBtnClass );
						},1000 );
					} 
			},
		
		// panel transition handler
		panelTrans: function (event) {
			
			var self = this,

			/* --------------------------- start JQM copy ------------------------ */
			// TODO: try referencing directly into JQM, this is duplicate code
			
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
				// TODO: try referencing directly into JQM, this is duplicate code
			
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
				
				// TODO: same as context, handler, create fakeEvent and fakeData
				var fakeEvent = {},
					fakeData = {};
					
				// assign fake attributes needed to add panel history entries
				fakeEvent.target = $targetContainer;				
				fakeData.toPage = $('#'+url);
															
				// keep it false! 				
				self.vars.$ignoreMyOwnNextHashChange = false;				
				
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
				
				}
				
		},
		
		// panel hashchange handler
		panelHash: function( e, hash, fullHash ) {
								
				var self = this;

				var to = $.mobile.path.stripHash( hash ),
					dialogHashKey = "&ui-state=dialog",
				
					// check for history-panels
					$panels = $('div:jqmData(hash="history")'),
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
				
				// this blocks hashChange calls set from panel-based transitions
				// otherwise the panelHash will fire two transitions! 				
				if ( self.vars.$ignoreMyOwnNextHashChange == false ) {					
					self.vars.$ignoreMyOwnNextHashChange = true;									
					return;
				}										

				// --------------------------- start JQM copy ------------------------ 
				// TODO: try referencing directly into JQM, this is duplicate code
				//existing base tag?
				var $base = self.vars.$head.children( "base" ),

				//tuck away the original document URL minus any fragment.
				documentUrl = $.mobile.path.parseUrl( location.href ),

				//if the document has an embedded base tag, documentBase is set to its
				//initial value. If a base tag does not exist, then we default to the documentUrl.
				documentBase = $base.length ? $.mobile.path.parseUrl( $.mobile.path.makeUrlAbsolute( $base.attr( "href" ), documentUrl.href ) ) : documentUrl;										

				// --------------------------- end JQM copy ------------------------ 

				// history routine works like this:
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

				// (I)				
				if ( to ) {			
					to = ( typeof to === "string" && !$.mobile.path.isPath( to ) ) ? ( $.mobile.path.makeUrlAbsolute( '#' + to, documentBase ) ) : to;					
					// (1) not in basic setup if n!=1
					if ( n==1 || longest.length/n != 1 ) { 								
						// for example 4 stacks, height 2,2,2,4 > longest.length = 1 /n=4 = 0,25 = panelHistory
							
						// (a) first check if a popover is active with a stack>1, this will be reduced first
						var activePop = $('.ui-panel-active.ui-popover');																	
						
						if ( activePop.length>0 && activePop.data("stack").length > 1 ) {	
							var pickFromStack = activePop.data("stack"),
								gotoPage = pickFromStack[pickFromStack.length-2];							
								//console.log("to-defined popover I-1-a gotoPage="+gotoPage);
							} else {								
								// (b) if all popovers are reset, check for highest fullwidth or main/menu panel
								var gotoPage = self._mmHandler ( longest.length, longest, longestLen);																																
								//console.log("to defined highest I-1-a gotoPage="+gotoPage);
								} 
						
							// need to declare fromPage here, because otherwise JQM removes .ui-page-active from the wrong panel (= active page in main panel);
							var fromPage = $( gotoPage ).closest(':jqmData(role="panel")').find('.ui-page-active'),
								changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true };						

							$.mobile.changePage ( gotoPage, changePageOptions );							
					
						} else {							
							// (2) basic setup of all panels, n=1, base setup, JQM should do this
							// var gotoPage = to;							
							// $.mobile.changePage( to, changePageOptions );
							// console.log("here? I-2")
							window.history.go(-self.vars.$windowHistoryCounter);
							self.vars.$windowHistoryCounter = 1;
							}	


							
					// (II no "to")
					} else {	
						// if "to" is not defined, it would be normal JQM, if not for the backwards transition
						// to the data-show="first" page on each panel. Since the URL doesn't show the #menu-1st, 
						// #main-1st, etc page at the beginning, a backward transition to this page result in to
						// being undefined, so we land here... and need the whole logic again
						// TODO: this has to be possible in a better way... 						
						// (1)								
						if ( n==1 || longest.length/n !== 1 ) { 
							var activePop = $('.ui-panel-active.ui-popover');
							// (a)							
							if ( activePop.length>0 && activePop.data("stack").length > 1 ) {									
								var pickFromStack = activePop.data("stack"),
									gotoPage = pickFromStack[pickFromStack.length-2];
									//console.log("no to, popovers II-1-a gotoPage="+gotoPage);
								} else {
									// (b)											
									var gotoPage = self._mmHandler(longest.length, longest, longestLen);															
									//console.log("no to, highest, II-1-b gotoPage="+gotoPage);
									}
									
									var fromPage = $( gotoPage ).closest(':jqmData(role="panel")').find('.ui-page-active'),
									changePageOptions = { fromPage: fromPage, pageContainer: $( gotoPage ).closest('div:jqmData(role="panel")'), fromHashChange: true };						
									
									$.mobile.changePage ( gotoPage, changePageOptions );	
									
								} else {
									// (2)										
									// need to make a backward/forward transition here... first page of the app. 
									if( longest.length/n == 1 ) {
											
											window.history.back(-1);	
											var gotoPage = "none";
											//console.log("longest.length="+longest.length+" n="+n+" longest.length/n="+longest.length/n)
											//console.log("??? manual window.back() - II-2-x gotoPage="+gotoPage);
										} else {																
											var gotoPage = $.mobile.firstPage;
											//console.log("??? no to, no setup, go to first page of panel, II-2 gotoPage="+gotoPage);
											$.mobile.changePage( $.mobile.firstPage, changePageOptions );									
											}
										
									}
						}					

											
				// as we have now made a transition, we need to block the next one coming from behind
				// same as in changePage handler							
				// self.vars.$ignoreMyOwnNextHashChange = false;				
				self.vars.$ignoreMyOwnNextHashChange = false;												
				
						
				// reduce panel stacks
				self.stackDown( "panelHash", gotoPage.replace(/[#]/, "") );
						
				// call active class clearing
				// maybe not... because also fires with regular JQM transitions.
				// TODO: how to set active class on back-btn?
				// self.clearActiveClasses( "panelHash", true, $(gotoPage), fromPage );
				
				// not sure I need to set this.
				// $.mobile.firstPage[ 0 ] = gotoPage;	

				// reset page container to prevent regular JQM loading pages into a container
				// pageContainer will be re-set on next panel-transition to correct panel,
				// but if a regular JQM transition fires pageContainer would be stuck at the 
				// panel the last page was loaded into. Therefore reset (like for the loader:
				$.mobile.pageContainer == $('body') ? $.mobile.pageContainer : $('body');  	
				
	
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
			/* // (b-3)[may want to keep] working selector for more than 3 panels with highest stack
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
			
			$(document).bind( "click", function( event ) {
				// splitview routine
				self.splitviewOnClick(event);
				
				var link = $( self.findClosestLink(event.target) );
				
				// panel transition rountine
				if ( link ) {
					self.panelTrans(event);
					}

				// context routine
				if ( link && link.jqmData('context') ) {
					self.context( link );					
					}
				
				});						
				
			// panel crumbify buttons
			// TODO: listening to live/pageshow on nested pages does not work. pagecreate fires too often, NOT NICE			
			$('div:jqmData(role="page")').live('pagebeforeshow.crumbs', function(event, data){							
				var $this = $(this);

				if ( $this.jqmData('wrapper') == true ) {				
					// parent page - regular back button, don't interfere
					// TODO: what other stuff is prevented here???
					event.preventDefault();
					} else if ( $this.closest(':jqmData(role="panel")').jqmData('hash') && $this.jqmData("show") != "first" ){					
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
				//document.title = "event="+event.type;				
				self.splitScreen(event);
				});

			// panel history handler
			$(window).bind('hashchange', function( e ) {
				// keep from firing when traversing above panel-level
				// = navigating between JQM pages or wrapper pages
				console.log("bind hashChange fired");
				if ( !$.mobile.pageContainer.is("body") ) {
					//console.log("can be hashed"+e.target+"  "+location.pathname);
					self.panelHash( e, location.hash, "#"+location.pathname )
					} else { 
						//console.log("hands off"+e.target+"  "+location.pathname);
						}
				});						
			
			
			// history stack management with crumbs buttons active
			$('.ui-crumbs').live('click', function() {
				var $this = $(this);				
				self.vars.$ignoreMyOwnNextHashChange == false;				
				self.vars.$crumbsBlockStackUp = true;
				self.stackDown( "crumbs", $this.closest(':jqmData(role="page")').attr('id') );				
				});	
				
			}
			
			
			
	});
$('html').data("lockup",30);
// initialize
var trigger = $('div:jqmData(wrapper="true")').live( 'pagecreate',function(event){ 
	console.log("plugin fired on"+$(this).attr('id') );
	console.log($('html').data("lockup"));
	$( this ).multiview();	
});

                

	
		
}) (jQuery,this);



