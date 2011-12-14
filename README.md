#### Log. Updates  
* 2011-11-08: reworked data-context, included in panel-history, updated page2.html to show example - first link in menu
* 2011-11-08: tested loading external pages into containers, updated page2.html to include example - popover1, page1-4 
* 2011-11-12: reworked toolbars, added support global/local header/footer and ui-element-fixed-top/bottom 
* 2011-11-17: added orientationchange support, removed panel-nav and hashChange from plugin, reworked panel CSS, bug fixes
* 2011-11-17: updated to JQM 1.0  
* 2011-11-21: fixes to history, integrated context and crumbs into panel-history routine, started integrating data-multiview="true" as trigger
* 2011-11-22: fixed popover toggles, added pop() transitions, keep panels alive with scrollview and loading pages into DOM, fixed active class removal
* 2011-11-23: fixed activeclass removal (again), fixed event bubbling, fixed plugin setup running for +1 wrapper pages in DOM, removed stuff not necessary anymore 
* 2011-11-28: enabled deep-linking, started panel-cache-management, partially fixed flickering footer, broke vertical scrolling (for now... )
* 2011-12-01: fixed deep-linking, done panel-cache-management, reworked CSS to fix scrolling, scrollbars showing, panel positioning, fixed jquery panel width and height
* 2011-12-05: added new options: _ui-menu-button-flex_ to place menu button anywhere on page, _data-autoshow="once"_ to open a popover once on load
* 2011-12-06: added switchable option to hide/show menu in splitview mode, bug fixed panel height and width, reworked history (still not good, but improving)
* 2011-12-14: improved fixed toolbars show/hide, new feature button-wrapper-right/left (controlgroups inside header), fixed back button/crumbs button, 
              added padding for iconpos="notext" buttons, added menu-button options, fixes to checkwidth
*****


1. Enable popover panels 
2. Enable multipage
3. Enable splitview  

#### B. Demo
The demo is **work-in-progress**. Go here: [Multiview Demo](http://www.stokkers.mobi/valuables/multiview/show/index.html "multiview")


#### C. Concept
 

#### D. Getting started

#### 1. Integration
A multiview page is a regular JQM page. To make it a multiview page, just add the _data-wrapper="true"_ attribute to your container page. Any header or footer added to this page will act as a global header/footer for all nested pages, while header/footer on the nested-page level are local.

If you just want to add popover panels to your page, drop them after the content section. For splitview or fullwidth panels, replace the content section with the respective panels.

Panel keys:  
* a panel can contain any number of nested pages (regular JQM pages)  
* nested pages can have header/footer spanning panel width and being local elements vs. global header/footer defined on the wrapping page  
* there are four supported panel types: (1) menu, (2) main and (3) fullwidth and (4) popover  
* any number of popovers are possible, but only one menu, main and fullwidth panel per "wrapper-page"  
* panels use **data-id**, while JQM pages use **id**, this ensures JQM doesn't mix them up  
* for a panel to work the first page to show needs to be specified by assigning **data-show="first"** to a page inside each panel   
 

#### 2. Screen Modes
Multiview is using three screenmodes:   
**(1) FullWidth/Splitview-Mode** with main section or menu/main section visible  
**(2) popover mode** on smaller screens (with toggle button) are similar to the original plugin.   
**(3) Fullscreen mode** for smaller displays. In this mode, everything that pops up (popovers or the menu in popover mode) becomes a fullscreen element layering on top of the actual page (sort of like a dialog).  


#### 3. Popovers
All popovers share the same functionalities, including the menu in popover mode. Popover panels can be formatted via CSS to be any size and position. However, only one popover can currently be open at a time(!).  

Setting up popovers requires a trigger button with the class of **.toggle_popover** and corresponding **data-panel="panel_name"** attribute. 


#### 4. Navigation
The plugin adds a second navigation layer which fires on any link that includes a **data-target="panel_name"**. This target tells JQM to not use regular transition from page to page. Instead a panel-transition is used, which can be either inside a panel (changepage inside panel A) or cross-panel (like changepage panel B fired from A). If no data-target is defined, normal JQM will handle the transition (easiest way to mess up things).  


#### 5. History
The plugin allows two types of "history".   

By adding **data-hash="crumbs"** to a panel, the plugin adds a back-button on every transitioned-to-page. Clicking this button reverses the transition (also works across panels).  

Adding **data-hash="history"** to a panel allows to use the browser or device back-button. This is done by panel-history-stacks, which the plugin initiates when a panel is created. As long as a panel is visible new entries are made to the respective stack on every pagechange with main/menu panels increasing together. On clicking the back button, the plugin checks for the highest panel history stack(s), picks the stack to be used and transitions to the last (non-yield) stack-entry. When all panel stacks are on the same level (this should be the basic setup), normal JQM takes over and does a regular hash-change based reverse transition. This is still WORK-IN-PROGRESS
A possible panel history scenario might look like this:
![multiview-2](http://www.stokkers.mobi/valuables/multiview/IMG/how3.png "multiview-concept3") 


#### 6. Fullscreen Mode
This mode fires automatically below a threshold screen width (320px) or if any popover.height plus offset from top is larger than screen.avail-height. In Fullscreen Mode the following things change:  
* buttons with class **.iconpos-switcher-a/div** are set to icon-only buttons to save space   
* the popover formatting is dropped. Menu and popovers are set to fullscreen size   
* Toggling a popover will open the popovers as a layer above the main-panel (maybe eventually make this a dialog)  
* any fixed header/footers on main panel are unfixed, header/footer on popover remain fixed  
* The main panel height (actual page height) is matched to the visible popovers height to enable device scrolling (user sees popover-panel, and scrolls main-panel behind). Once the panel is closed, the height is set back to its original value  


#### 7. Scrolling
Multiview uses the scrollview plugin, which will only be initiated on touch devices, while in splitview/fullscreen mode. In this case (should be tablets only) all popovers and the menu use scrollview, while the main section uses device scrolling.     

On desktop all panels have regular scrollbars. In fullscreen mode only the main panel device-scrolls with its height being matched to any open popover (see above). The idea is to keep scrollview use to a minimum versus device scrolling and more importantly, to not end up with device scrolling and scrollview firing at the same time.  

#### 8. Fixed Elements and global header/footer
Multiview adds two new fixed elements:  

**.ui-element-fixed-top** and **.ui-fixed-element-bottom**   

These can be used to attach panels (or any other element) to a fixed header/footer. This way when scrolling on a page, the panels will be re-positioned together with the fixed header/footer. Otherwise they would be stuck at their set position which is scrolled out of view. 
Fixed elements will be hidden together with header/footer once scrolling starts. However, they do not re-appear automatically. The user has to click the toggle-button to make them show up again.  

To setup a global header or footer, just position it outside the panel and inside the wrapper page. These elements will be used across all panel pages.
*****

#### 9. Autoshow, Centered Popovers and Switchable
The plugin offers some additional functionalities, among them:  
* set _data-autoshow="once"_ on a po tpover and it will show once when the page finishes loading (think login window for an application)  
* give your popover a class of _.ui-popover-center_ and the popover will be positioned center-screen
* if you want to toggle the menu in splitview mode, you can add the plugin option _switchable:true_, which will show the menu toggle button in splitview mode, too. Use the additional options to configure the button icon and whether to show the menu on load.  
* by default, the menu button is inside the header. You can now move it to any element in the main section by adding a class of _.ui-menu-button-flex_ to this element.

#### 10. Context Loading  
Specifying **data-context="page_name"** and **data-context-panel="panel_name"** on a link will trigger an additional (context-)changePage when this link is fired. For example calling a submenu in the menu panel could trigger a changepage in the main section to transition to a related page simultaneously. Context loading will also adds entries to the panel history, so clicking the back button twice will revert both transitions (still in wrong order).

#### 11. Deep Linking
Deeplinks work for all pages that are in the wrapper page when it's loaded. For pages that are added programmatically or via AJAX, the plugin currently breaks. Will be changed to at least showing the main page, or solved by adding a sitemap in the plugin options, which specifies pages-not-on-board-on-load and which panels they should be in. 
