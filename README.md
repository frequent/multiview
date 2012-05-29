#### Jquery Mobile Multiview Plugin ####

version based on **JQM 1.1.0** (May 2012)

1. Required Files   
  To use this plugin you will need 3 files:  
     
     - jquery.mobile.multiview.js (gzip 7k/9k (incl. [Overthrow](https://github.com/filamentgroup/Overthrow/) scoller)
     - jquery.mobile.multiview.css (gzip 1k) 
     - jquery.mobile-1.1.0.multiview - Jquery Mobile with slight modifications (details below)

  Multiview now uses **Overthrow** as default scroller. The scroller is only necessary inside popover-panels or if you want to use the screen-lock function (scrollmode="overthrow") to allow side-by-side panels to scroll independently. Earlier versions used the experimental [JQM **Scrollview**](http://jquerymobile.com/demos/1.0a3/experiments/scrollview/) plugin, which in my view had a better performance, but currently seems no longer supported by JQM. Overthrow is at version 0.1 so I'm hoping this will develop into a proper polyfill. I will try to setup the plugin so you are free to choose which scroller to use. Will be some time though.  
	 	 
2. Current Status   
Aside from some smaller bugs, multiview 1.1.0 is working fine.  

Demo Page: [JQM multiview plugin](http://www.stokkers.mobi/jqm/multiview/demo.html)  

The demo pages show all features and attributes, plus provides templates you can use to get started. Below I'm only listing the quick start and all available attributes. For more details, please refer to the Demo page. 

3. JQM Modifications  
The plugin now needs 4 remaining tweaks to JQM (eventually hoping to be tweak-free):

  - add changePage option *pageContainer* to the *$.mobile.urlHistory* to run panel navigation and history through JQM
  - add an if-clause to also remove active class from multiview wrapper-pages when leaving them
  - add an if-clause to prevent removing wrapper pages from the DOM when leaving them 
  - add a && condition to the plugin initalization allowing to deeplink to panel pages  
  
  Everything else is running on pure JQM. 

4. Quick Start
   - Start with a regular JQM page
   - Add **data-wrapper="true"** to the page. If you have a header and footer, these will be your **global toolbars**.    
   - **Replace the content with panels**. Panels must be &lt;div&gt; elements and need *data-role="panel"*, *data-panel="menu|mid|main|popover"*, plus
   *data-id="your-panel-name"* attributes.  
   - If you only want a **fully loadable multipage**, just include a main panel. JQM will always load the wrapper with all nested pages, so you can use multiple multiview-multipages :-)
   - Place **JQM pages inside panels**. These are normal pages with header and footer being **local toolbars** (only on the page).  
   - Currently you need to have at least one page in a panel, which requires the **data-show="first"** attribute.  
   - All other pages can be loaded in externally, so you can start with a **multiview-shell** and **load pages as you need**.  
   - If you are using **popovers** you need a button to hide/show the panel. This button requires a class of *toggle_popover* and an attribute of *data-panel="your-panel-name"*  
   - Popovers can be any size and you can position them using *CSS:margin-top* and *CSS:right*  
   - If you want to trigger a **panel transition** programmatically, you only need to supply the pageContainer option. This must be an *object* like **$('div:jqmData(id="your\_panel\_name")')** 
   in order to work.  
   - For links that should trigger panel transitions, just add a *data-panel="your-panel-name"* to the link.   
  
	More details and examples can be found on the demo page. 

5. Attributes:  
This is a list of all attributes you can use.

	a) general (wrapper page )
<TABLE cellspacing="2" border="1">
<tr>
	<td>data-wrapper="true"</td>
	<td>REQUIRED on wrapper-page</td>
	<td>put this on your wrapper page to fire the plugin</td>
</tr>
<tr>
	<td>data-scrollMode="overthrow"</td>
	<td>OPTIONAL on wrapper-page (new)</td>
	<td>this locks the active page to screen dimensions and uses Overthrow to scroll panels independently from one another.</td>
</tr>
<tr>
	<td>data-yieldmode="true"</td>
	<td>OPTIONAL on wrapper-page (new)</td>
	<td>By default popovers and menu|mid panels will open as *popovers* in popover-mode and *fullscreen* in fullscreen-mode. 
	Setting this attribute will also use *fullscreen* pages in **popover-mode** (still buggy!)</td>
</tr>
</TABLE>

	b) on the menu|mid panel

	<TABLE cellspacing="2" border="1">
	<tr>
		<td>data-role="panel"</td>
		<td>REQUIRED on div-panel</td>
		<td>tells the plugin this is a panel</td>
	</tr>
	<tr>
		<td>data-id="your-panel-name"</td>
		<td>REQUIRED on div-panel</td>
		<td>the name of your panel is used for all transition, so you can also run 2+ multiview pages in your app</td>
	</tr>
	<tr>
		<td>data-panel="panel-type"</td>
		<td>REQUIRED on div-panel</td>
		<td>type of panel. Can be **Menu|Mid|Main|Popover**. (*fullwidth* panel has been removed, please use *main* instead)</td>
	</tr>
	<tr>
		<td>data-hash="history"</td>
		<td>(REMOVED)</td>
		<td>panel history is now active by default</td>
	</tr>
	<tr>
		<td>data-switchable="true"</td>
		<td>OPTIONAL</td>
		<td>menu and mid panel are visible by default in splitscreen mode. If you set the *switchable* option to *true*, the panels can be toggled in splitscreen mode, 
		so you can expand the main panel fullscreen (for example hide/show search criteria).</td>
	</tr>
	<tr>
		<td>data-switchableHideOnLoad="true"</td>
		<td>OPTIONAL</td>
		<td>whether to show the menu/mid panel when the page first loads</td>
	</tr>
	<tr>
		<td>data-menu|mid-text="text"</td>
		<td>OPTIONAL</td>
		<td>Text for the menu|mid button, defaults are *MENU* and *MID*</td>
	</tr>
	<tr>
		<td>data-menu|mid-iconpos="yourIconpos"</td>
		<td>OPTIONAL</td>
		<td>Iconpos for the menu|mid button, default is *left* </td>
	</tr>
	<tr>
		<td>data-menu-theme="your_theme"</td>
		<td>OPTIONAL</td>
		<td>theme for the menu|mid button, default is *a*</td>
	</tr>
	<tr>
		<td>data-menu|mid-icon="search"</td>
		<td>OPTIONAL</td>
		<td>icon for the menu|mid button, default is *search*</td>
	</tr>
	<tr>
		<td>data-menu|mid-width="15%"</td>
		<td>OPTIONAL (new)</td>
		<td>width of the menu|mid panel, default is *25%*</td>
	</tr>
	<tr>
		<td>data-menuMinWidth|midMinWidth-width="100px"</td>
		<td>OPTIONAL  (new)</td>
		<td>min-width of the menu|mid panel, default is *250px*</td>
	</tr>
	<tr>
		<td>data-yield-to="none|your-panel-name"</td>
		<td>OPTIONAL</td>
		<td>In yieldmode, this sets the order of panels to show. The panel to show first should have *data-yield-to="none"* specified, which makes it
			supercede all other panels. If the main panel is yielding to none, the menu panel needs *data-yield-to="main"* so it will be hidden by default and
			only shown when the toggle/switchable button is pressed (still buggy!).
	</tr>
	</table>

	c) on panel pages

	<TABLE cellspacing="2" border="1">
	<tr>
	<td>data-show="first"</td>
	<td>REQUIRED on div-page</td>
	<td>tells the plugin, which page to display first in a panel and also is used as a fallback on backwards panel transitions, so you **must** specifiy a page
	with *data-show="first"* in order for the last backwards transition to work properly. Not doing so will give you a blank panel and break the panel
	navigation on the last backwards transition.</td>
	</tr>
	<tr>
		<td>data-autoshow="once"</td>
		<td>OPTIONAL on popovers</td>
		<td>Show a popover panel once when the page is loaded the first time (for example a login window)</td>
	</tr>
	</table>		

	d) inside pages
	<TABLE cellspacing="2" border="1">	
	<tr>
		<td>data-drop-pop="true"</td>
		<td>OPTIONAL on any element (new)</td>
		<td>If you want to place the menu|mid switchable button outside of the header you can add *data-drop-pop="true"* to any element inside your page. The 
		switchable buttons will then be inserted here (either a single button if only a menu is used or a controlgroup if both mid|menu are used).</td>
	</tr>
	</table>

	e) used in **methods**
<TABLE cellspacing="2" border="1">
<tr>
	<td>data-panel="your-panel-name"</td>
	<td>REQUIRED on panel transition links</td>
	<td>sets $.mobile.pageContainer from body to panel before transitions. This is the panel your transition should go to.</td>
</tr>
<tr>
	<td colspan="3" style="text-align: left;">**example programmatic changePage:** <br/>
	 $.mobile.changePage('#page', {pageContainer: $('div:jqmData(id="your-panel-name")') });<br />
	 **example popover button:**<br/>
	&lt;a href="#" data-role="button" data-panel="my_panel" class="toggle_popover"&gt;Button&lt;/a&gt;
	</td>
</tr>
<tr>
	<td>data-context</td>
	<td>REQUIRED on context links</td>
	<td>add this attribute to a link if you want to do double transitions = changePage in panel 1 and also changePage in panel 2 (for example
	load a list and it's first entry). This currently only works with links!</td>
	</tr>
<tr>
	<td>data-context-panel</td>
	<td>REQUIRED on context links</td>
	<td>you also need to specifiy the panel for the 2nd transition</td>
</tr>
</table>
						
6. Please note:
 - The plugin currently **ONLY SUPPORTS FIXED TOOLBARS**. I'm working to change this, but so far the CSS has been tricky...
 - There are **3 layout modes**: >768px = splitscreen, >468 = popover, <468 = fullscreen. These are settable options now.
 - in **fullscreen-mode**, all popovers are changed to **fullsize JQM pages**, opening a popover in fullscreen pop-transition a regular JQM page. 
 - **Overthrow** is only used for popovers in splitview and popver mode. 
 - **Back buttons are inserted automatically**. Currently there is no option to turn these off. 
 - There is a **sitemap** object in the plugin options, which stores all external pages the user goes to. You can also use this object to store
   deeplinkable pages which are not "on board" when the initial page loads (not working yet).
 - The header uses **.headWrapRight|Left** containers. You can put **ONE** element (button/select...) on each side of the header. On the left hand side
   the plugin will add up to three buttons (back button, toggle menu, toggle mid). All buttons will be **grouped to a controlgroup** and set to **iconpos=notext**
   on small screen sizes in order to fit them in header.
 
That's it. Hope you enjoy the plugin! Any suggestions, improvements, bugs, please file under issues.
