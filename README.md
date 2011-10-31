Jquery Mobile Multiview Plugin
==============================

A. What does Multiview do?
--------------------------
1.enable multipage navigation (loading full multipages)  
2.multipanel view ("splitview")  
3.any number of popover-panels with multiple pages inside  


B. Concept
----------
![multiview-1](http://www.stokkers.mobi/valuables/multiview/IMG/how1.png "multiview-concept1")  
![multiview-2](http://www.stokkers.mobi/valuables/multiview/IMG/how2.png "multiview-concept2")  


C. Demo
----
The demo is **work-in-progress** and can be found here: [http://www.stokkers.mobi/valuables/multiview/page2.html](http://www.stokkers.mobi/valuables/multiview/page2.html "multiview"):  

The following pages are in the Demo:  

* Page#1 = plain page
* Page#2 = multiview page with splitview and two popovers (total 4 panels, 16 pages)
* Page#3 = plain page
* Page#4 = multiview page with fullwidth panel (1 panel, 5 pages)
* Page#5 = multiview page with two popovers (3 panels, 10 pages)  

As of now the multiview pages only work if loaded directly. They can be loaded in via Ajax, but the panel navigation still needs some tweaking (see Todo below)


D. Concept Notes
----------------
#### 1. Integration
A multiview page is a regular JQM page having some class triggering the plugin (demo uses **.type-home**). Any header or footer added to this page will act as a global header/footer for all nested pages, while header/footer on the nested-page level are local.

The big difference is the content section. Multiview-pages use panel(s) instead of content. 

Panel keys:  
* a panel can contain any number of nested pages (regular JQM pages)  
* nested pages can have header/footer spanning panel width and being local elements vs. global header/footer defined on the wrapping page  
* there are four supported panel types: (1) menu, (2) main and (3) fullwidth and (4) popover  
* any number of popovers are possible, but only one menu, main and fullwidth panel per "wrapper-page"  
* panels use **data-id**, while JQM pages use **id**, this ensures JQM doesn't mix them up  
* for a panel to work the first page to show needs to be specified by assigning **data-show="first"** to a page inside each panel   
*****

#### 2. Screen Modes
Compared to the original splitview plugin, multiview is using three states. **(1) FullWidth/Splitview-Mode** with main section or menu/main section visible, **(2) popover mode** on smaller screens (with toggle button) are similar to the original plugin. For smaller displays **(3) Fullscreen mode** was added. In this mode, everything that pops up (popovers or the menu in popover mode) becomes a fullscreen element layering on top of the actual page (sort of like a dialog).  
*****

#### 3. Popovers
All popovers share the same functionalities, including the menu in popover mode. Popover panels can be formatted via CSS to be any size and position. However, only one popover can currently be open at a time(!).  

Setting up popovers requires a trigger button with the class of **.toggle_popover** and corresponding **data-panel="panle_name"** attribute. 
*****

#### 4. Navigation
The plugin adds a second navigation layer which fires on any link that includes a **data-target="panel_name"**. This target tells JQM to not use regular transition from page to page. Instead a panel-transition is used, which can be either inside a panel (changepage inside panel A) or cross-panel (like changepage panel B fired from A). If no data-target is defined, normal JQM will handle the transition (easiest way to mess up things).  
  
To programmatically call a changePage on a panel the additional option parameter **pageContainer: target_Panel** has to be included in the function call, which specifies the target panel to load the new page into).
*****

#### 5. History (still needs work...)
The plugin allows two types of "history" (both active in the demo).   

By adding **data-hash="crumbs"** to a panel, the plugin adds a back-button on every transitioned-to-page. Clicking this button reverses the transition (also works across panels).  

Adding **data-hash="history"** to a panel allows to use the browser or device back-button. This is done by panel-history-stacks, which the plugin creates when a panel is created. As long as a panel is visible new entries are made to the respective stack on every pagechange with main/menu panels increasing together (the panel not loading a new page will get a "yield" entry). On clicking the back button, the plugin checks for the highest panel history stack(s), picks the stack to be used and transitions to the last (non-yield) stack-entry. When all panel stacks are on the same level (this should be the basic setup), normal JQM takes over and does a regular hash-change based reverse transition.  
A possible panel history scenario might look like this:
![multiview-2](http://www.stokkers.mobi/valuables/multiview/IMG/how3.png "multiview-concept3") 
*****

#### 6. Fullscreen Mode
This mode fires automatically below a threshold screen width (320px) or if any popover.height plus offset from top is larger than screen.avail-height. In Fullscreen Mode the following things change:  
* buttons with class **.iconpos-switcher-a/div** are set to icon-only buttons to save space   
* the popover formatting is dropped. Menu and popovers are set to fullscreen size   
* Toggling a popover will open the popovers as a layer above the main-panel (maybe eventually make this a dialog)  
* any fixed header/footers on main panel are unfixed, header/footer on popover remain fixed  
* The main panel height (actual page height) is matched to the visible popovers height to enable device scrolling (user sees popover-panel, and scrolls main-panel behind). Once the panel is closed, the height is set back to its original value  
*****

#### 7. Scrolling
Multiview uses the scrollview plugin, which will only be initiated on touch devices, while in splitview/fullscreen mode. In this case (should be tablets only) all popovers and the menu use scrollview, while the main section uses device scrolling.     

On desktop all panels have regular scrollbars. In fullscreen mode only the main panel device-scrolls with its height being matched to any open popover (see above). The idea is to keep scrollview use to a minimum versus device scrolling and more importantly, to not end up with device scrolling and scrollview firing at the same time.  

#### 8. Fixed Elements (= potentially serious flickering, until worked out)
Multiview adds two new fixed element classes:  

**.ui-element-fixed-top** and **.ui-fixed-element-bottom**   

These can be used to attach panels (or any other element) to a fixed header/footer. This way when scrolling on a page, the panels will be re-positioned together with the fixed header/footer. Otherwise they would be stuck at their set position which is scrolled out of view. 

Fixed elements will be hidden together with header/footer once scrolling starts. However, they do not re-appear automatically. The user has to click the toggle-button to make them show up again.  
*****

#### 9. Changes inside JQM:
To make the plugin work a few changes have been made to JQM. Alternatively these could set in a file sitting before JQM and running at mobileinit. The following things have been changed:  
* resetPageHeight: added if-clause to correctly reset height on popover panels  
* changePage: new parameter pageContainer. Added panel navigation, which should be re-located back to plugin  
* hashChange: panel-hashChange-handler, should be re-located back to plugin  
* pageHide: added if-clause to not drop the whole multiview page on panel-transitions  
* fixedToolbars: added additional elements to the selector and modified if-clauses to attach fixed behavior to fixed-elements
*****

#### 10. Todos  
The plugin still requires plenty of work, including:  
* rework CSS reposition main/menu panel, CSS is bad  
* rework CSS page heights  
* rework CSS z-indexing to avoid wrong panel blinking during transitions in fullscreen mode  
* rework CSS to hide global header/footer in fullscreen mode if popover is open?  
* get changeHash to work if no pushstate support (currently not working)  
* integrate data-context  
* allow deeplinking  
* integrate form submit and pefetching  
* element-fixing and fixed toolbars are currently broken  
* allow flexible menu/main width  
* allow 2+ column layouts with more than two panels?  
* find out why IE7 and Blankberry don't like multiview, while IE8 does   
* cleanup code and testing  
*****


