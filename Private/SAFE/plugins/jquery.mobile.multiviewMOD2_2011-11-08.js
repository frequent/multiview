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
 * gulliver           manage screen mode Small, Medium, Large, Supersize. Small = fullscreen mode
 * checkWidth         manage width of content (cause of 15px padding and content min-height)
 * heightened         [helper] get height of content
 * framer             [helper] get screen mode
 * expandHeight       [helper] set page height in fullscreen mode
 * stackUp			  add entries into panel-history-stacks
 * _mainEvents        event bindings for the plugin
 *
 */
 
// TODOS:		
		
		// fullscreen mode, make header-visibility change earlier
		// fullscreen mode, attach fixed-header properties to active page on menu or popover
		// find a way to hide popovers on scrollstart... they should not be open, when the toolbars re-appear
		// silentScroll(top) when opening a popover!	
		// make all vars global		
		// deeplinks not working
		// transitions not smooth, z-index:-1 for new page while pulling it up?
		// position popover triangel relative to window or toggle button?
		// check if footer z-index is causeing the flickering in splitview mode - check menu-content z-index and height
		// check context handler	
		// integrate orientationchange
		// add border-right
		// find out why IE8 works (except fixed footer) and IE7 breaks...
		// put history stack handler and panel navigation in here by preventDefault on event.binding+condition
		
		

(function($,window){
	$.widget("mobile.multiview",$.mobile.widget, {
		vars: {
			$html:$('html'),
			$panel:$("div:jqmData(role='panel')"),
			$main:$("div:jqmData(panel='main')"),
			$menu:$("div:jqmData(panel='menu')"),
			$popover:$("div:jqmData(panel='popover'), .ui-popover-mode div:jqmData(panel='menu')")
		},

		_create: function() {		
			var self = this;

			// support touch
			if($.support.touch){
				self.vars.$html.addClass('touch');
				}
			
			// classes
			self.vars.$html.addClass('multiview');							
			self.vars.$panel.addClass('ui-mobile-viewport ui-panel');			
			
			// history
			$('div:jqmData(hash="history")').data("history","off");
			
			// init panel history, pagecreate seems to work with panels, too...
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
				if($(this).hasClass('ui-triangle-top')) {
					// TODO: top/left/right/bottom?
					$(this).prepend('<div class="popover_triangle"></div>');
					}
				});
				
			// close popovers
			$('.closePanel').live('click', function () {
				console.log("close button");
				hideAllPanels();
				});

			/* these two create toolbar-havoc... first one active stops footer from showing up on pageload and scrollTop, combined with 
			   2nd one you get serious toolbar flickering... */	
			// hide on scrollStart
			/* $('div:jqmData(panel="main") div:jqmData(role="content"), div:jqmData(panel="menu") div:jqmData(role="content") ').bind('scrollstart', function() {
			 *	//hideAllPanels();
			 *	});
			
			// also on desktop
			$(document).scroll(function(){
				console.log("scroll");
				hideAllPanels();
				});
			 */ 
			 
			// hide on click tap on body
			$('div:jqmData(panel="main")').live('click tap', function(event) {				
				if (!$(event.target).closest('.ui-popover').length && !$(event.target).closest('.toggle_popover').length) {
					console.log("tap body");
					$(".ui-popover").stop(true, true).hide();
					$('.toggle_popover').removeClass($.mobile.activeBtnClass);
				};
			  });

			// hide on pageChange
			$('div:jqmData(panel="main") div:jqmData(role="page")').live('pagebeforehide', function(event) {
				console.log("change Baby, hide now");
				hideAllPanels();
				});

			// hide on click of link in panel, which leads to another panel
			$('a:jqmData(panel="main")').bind('click', function () {
				console.log("hide on panel leads to another panel click");
				hideAllPanels();
				});

			//$('div:jqmData(panel="popover") div:jqmData(role="page")').live('pagebeforehide', function(event) {
				// retain active class on popovers
				//});

			function hideAllPanels () {
				$('.toggle_popover').removeClass('ui-btn-active');
				// remove all expandHeight() formatting
				$('.ui-expand').css({'height':'','overflow-y':'auto'});
				$('.ui-fullscreen div:jqmData(panel="main") .ui-page-active div:jqmData(role="header")').attr('data-position','fixed')
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
				$('.ui-fullscreen div:jqmData(panel="main") .ui-page-active div:jqmData(role="header")').removeAttr('data-position')
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
							
							page.find('div:jqmData(role="header")').prepend('<a class="ui-crumbs ui-btn-left" data-icon="arrow-l"></a>');														
							
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
								button.replaceWith('<div class="headLogg headerMenuLeft iconposSwitcher-div ui-corner-all ui-controlgroup-horizontal" data-type="horizontal" data-role="controlgroup"><a class="ui-crumbs ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-left" data-target="'+targetID+'" data-iconpos="left" data-inline="true" data-icon="arrow-l" data-role="button" href="#'+href+'" data-theme="a"><span class="ui-btn-inner ui-corner-left ui-controlgroup-last"><span class="ui-btn-text">'+text+'</span><span class="ui-icon ui-icon-left ui-icon-shadow"></span></span></a><a class="toggle_popover ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-panel="menu" data-iconpos="left" data-inline="true" data-icon="'+$currentIcon+'" data-role="button" href="'+$currentTarget+'" rel="'+$currentRel+'" title="'+$currentTitle+'" data-theme="a"><span class="ui-btn-inner ui-corner-right"><span class="ui-btn-text">'+$currentText+'</span><span class="ui-icon ui-icon-stokkers ui-icon-shadow"></span></span></a></div>');
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
							$oldButton = '<a data-iconpos="notext" data-theme="a" class="ui-home ui-btn-left ui-btn ui-btn-up-a ui-btn-icon-notext ui-btn-corner-all ui-shadow" data-direction="reverse" data-transition="slide" data-icon="stokkers" data-role="button" href="#" title="Stokkers"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-text">Stokkers</span><span class="ui-icon ui-icon-stokkers ui-icon-shadow"></span></span></a>';					
						
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
																										
						$button.replaceWith('<div class="ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle ui-btn ui-btn-inline ui-btn-icon-left ui-btn-corner-all ui-shadow ui-btn-up-a" data-type="horizontal" data-role="controlgroup"><a class="ui-controlgroup-btn-notext ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-notext ui-corner-left" data-iconpos="notext" data-inline="true" data-icon="'+$buttonIcon+'" data-role="button" href="'+$buttonTarget+'" rel="'+$buttonRel+'" title="'+$buttonTitle+'" data-theme="a"><span class="ui-btn-inner ui-corner-left"><span class="ui-btn-text">'+$buttonText+'</span><span class="ui-icon ui-icon-stokkers ui-icon-shadow"></span></span></a><a class="popover-btn toggle_popover ui-controlgroup-btn-left ui-btn ui-btn-up-a ui-btn-inline ui-btn-icon-left ui-corner-right ui-controlgroup-last" data-iconpos="left" data-inline="true" data-panel="menu" data-icon="menu" data-role="button" href="#" data-theme="a"><span class="ui-btn-inner ui-corner-right ui-controlgroup-last"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></a></div>');	
						
						// or insert plain menu button if no button exists
						} else {
							
							//if ( $header.children('.menuToggle').length == 0 ) {								
								$header.prepend('<a data-iconpos="left" data-inline="true" data-icon="menu" data-role="button" href="#" data-theme="a" class="ui-btn-up-a ui-btn ui-btn-icon-left ui-btn-corner-all ui-shadow ui-home popover-btn iconposSwitcher-a toggle_popover menuToggle" data-panel="menu"><span class="ui-btn-inner ui-btn-corner-all"><span class="ui-btn-corner-all"><span class="ui-btn-text">Menu</span><span class="ui-icon ui-icon-menu ui-icon-shadow"></span></span></span></a>');												
								//}						
							}
						
						// make popover dialog in fullscreen mode
						if( $('html').hasClass('ui-fullscreen') ) {
							$('.menuToggle').attr('data-rel','dialog');
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
				if( !$('html').hasClass('ui-fullscreen') ) {					
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
			
		context: function() {
				var self = this;
				//data-context handler - a page with a link that has a data-context attribute will load that page after this page loads
				//this still needs work - pageTransitionQueue messes everything up.
				var $this=$(this),
					$currPanelActivePage = $this.children('.' + $.mobile.activePageClass),
					panelContextSelector = $this.jqmData('context'),
					pageContextSelector = $currPanelActivePage.jqmData('context'),
					contextSelector= pageContextSelector ? pageContextSelector : panelContextSelector;
					
				//if you pass a hash into data-context, you need to specify panel, url and a boolean value for refresh
				if($.type(contextSelector) === 'object') {
					var $targetContainer=$('div:jqmData(id="'+contextSelector.panel+'")'),
						$targetPanelActivePage=$targetContainer.children('div.'+$.mobile.activePageClass),
						isRefresh = contextSelector.refresh === undefined ? false : contextSelector.refresh;
						
					if(($targetPanelActivePage.jqmData('url') == contextSelector.url && contextSelector.refresh)||(!contextSelector.refresh && $targetPanelActivePage.jqmData('url') != contextSelector.url)){
						$.mobile.changePage(contextSelector.url, options={transition:'fade', changeHash:false, pageContainer:$targetContainer, reloadPage:isRefresh});
						}
					}
					else if(contextSelector && $currPanelActivePage.find(contextSelector).length){
						$currPanelActivePage.find(contextSelector).trigger('click');
						}
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
			
		getClosestBaseUrl: function ( ele ) {			
			var self = this;
			// Find the closest page and extract out its url.			
			var url = $( ele ).closest( ".ui-page" ).jqmData( "url" ),
				base = self.vars.documentBase.hrefNoHash;
			if ( !url || !$.mobile.path.isPath( url ) ) {
				url = base;
				}
			return $.mobile.path.makeUrlAbsolute( url, base);
			},
			
		gulliver: function() {
			var self = this,
				$allPanels = $('div:jqmData(panel="popover"), div:jqmData(panel="menu")');				
						
			// small = fullscreen
			if ( self.framer() == "small") {					
												
				$('html').addClass('ui-fullscreen');				
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
					$('html').removeClass('ui-fullscreen');
					
					}
					
			// initialize scrollview - only on touch devices MENU and POPOVERS, if not in fullscreen mode. 
			// other scenarios handled by device scrolling or desktop scrollbars
			if ( $("html").hasClass('ui-fullscreen') == false && $("html").hasClass('touch') ) {				
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
						$backButton = '<a href="#" data-role="button" data-icon="back" data-inline="true" data-iconpos="left" data-theme="a" class="back_popover ui-btn-left closePanel">'+$closeFirstPage+'</a>';
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
				
				
				// set content height across all pages, except for popovers, which are handled by newResetActiveHeight in JQM				
				var $thisPage=$('div:jqmData(role="page")').not('.type-home, div:jqmData(panel="popover") div:jqmData(role="page"), .ui-popover-mode div:jqmData(panel="menu") div:jqmData(role="page")'),				
					// var $thisPage=$('div:jqmData(role="page")').not('.type-home, div:jqmData(panel="popover") div:jqmData(role="page")'),				
					$exactContentHeight = self.heightened($thisPage);									
					$thisPage.children(':jqmData(role="content")').css({'min-height': $exactContentHeight});
				
				/* previous version
				if ( $('.ui-popover-mode').length == 1 ) {					
					$('.ui-popover-mode div:jqmData(panel="menu") div:jqmData(role="page") div:jqmData(role="content")').css({'min-height': '1px !important'}); 
					$thisPage.children(':jqmData(role="content")').css({'min-height': $exactContentHeight});
					} else {						
						$('div:jqmData(panel="menu") div:jqmData(role="page")').children(':jqmData(role="content")').css({'min-height': $exactContentHeight});
						$thisPage.children(':jqmData(role="content")').css({'min-height': $exactContentHeight});
						}	
				*/
		
			}, 
			
		heightened: function ($thisPage) {

				// exact content height	
				// TODO find solution for menu and main panel, with only main having a "global footer"
				// TODO stinks... looks ok if loading page2 direct, off if loading page indirectly...differentiate with data-page-external="true"
				$header=$thisPage.children(':jqmData(role="header")'),
				$content=$thisPage.children(':jqmData(role="content")'),
				$footer=$thisPage.children(':jqmData(role="footer")'),
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
					
			if ( self.vars.$html.hasClass('ui-fullscreen') ) {				
				if (action == "toggle") {									
						// popover will be shown = make MAIN page height equal POPOVER page height = enable device scrolling... :-)
						var $benchMarkHeight = masterPage.find('div:jqmData(role="content")').outerHeight();												
						$('div:jqmData(panel="main") .ui-page-active div:jqmData(role="content")').addClass('ui-expand').css({'height': $benchMarkHeight-30, 'overflow-y':'hidden'});									
					} else {
					// pageChange on panel - adjust
				
					}
				} 
			},			
			
		stackUp: function (event, data) {
					
				//TODO: does JQM store the full path or only the #page in history? 
				//Stacking up works in iOS, but I clicking back button goes nowhere.
				var self = this;			
				var $targetPanel = $( event.target ),
					$targetPanelID = $targetPanel.jqmData('id'),					
					$targetPage = '#'+ data.toPage.attr('id');															
							
				// if target panel has data-hash="history" add entry to panel stack			
				if ( $targetPanel.jqmData('hash') == 'history' ) {
					// if main or menu is the target increase both, one if targetPage, the other one with "yield"
					// as both menu and main can be active in splitview mode, the highest hist.length does not
					// necessarily imply the back transition is on that panel. Therefore main and menu are 
					// increased evenly, and on back transitions, the last entry not being "yield" is used.
					// TODO: not sexy... 	
					if ( $targetPanelID == 'menu' ) {						
						self.vars.$main.data("stack").push("yield");
						self.vars.$menu.data("stack").push($targetPage);						
						} else if ($targetPanelID == 'main') {																			
							self.vars.$main.data("stack").push($targetPage);
							self.vars.$menu.data("stack").push("yield");
							} else { 												
								$targetPanel.data("stack").push($targetPage);	
								}
					
					}								
			}, 
		
		
		_mainEventBindings: function () {
		
			var self = this;
			
			$(document).bind( "click", function(event) {
				self.splitviewOnClick(event);
				});
					
			// Crumbs handler
			// TODO: listening to live/pageshow on nested pages does not work. pagecreate fires too often, this is ok, but not perfect			
			$('div:jqmData(role="page")').live('pagecreate.crumbs', function(event, data){									
				if ( $(this).hasClass('type-home') ) {				
					// parent page - should be done by regular back button, don't interfere
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


/**
  * Klass.js - copyright @dedfat
  * version 1.0
  * https://github.com/ded/klass
  * Follow our software http://twitter.com/dedfat :)
  * MIT License
  */
!function(a,b){function j(a,b){function c(){}c[e]=this[e];var d=this,g=new c,h=f(a),j=h?a:this,k=h?{}:a,l=function(){this.initialize?this.initialize.apply(this,arguments):(b||h&&d.apply(this,arguments),j.apply(this,arguments))};l.methods=function(a){i(g,a,d),l[e]=g;return this},l.methods.call(l,k).prototype.constructor=l,l.extend=arguments.callee,l[e].implement=l.statics=function(a,b){a=typeof a=="string"?function(){var c={};c[a]=b;return c}():a,i(this,a,d);return this};return l}function i(a,b,d){for(var g in b)b.hasOwnProperty(g)&&(a[g]=f(b[g])&&f(d[e][g])&&c.test(b[g])?h(g,b[g],d):b[g])}function h(a,b,c){return function(){var d=this.supr;this.supr=c[e][a];var f=b.apply(this,arguments);this.supr=d;return f}}function g(a){return j.call(f(a)?a:d,a,1)}var c=/xyz/.test(function(){xyz})?/\bsupr\b/:/.*/,d=function(){},e="prototype",f=function(a){return typeof a===b};if(typeof module!="undefined"&&module.exports)module.exports=g;else{var k=a.klass;g.noConflict=function(){a.klass=k;return this},a.klass=g}}(this,"function")


