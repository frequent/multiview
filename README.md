#### Jquery Mobile Multiview Plugin ####

version based on **JQM 1.0.1**

1. Quick Guide  
To use this plugin you will need 3 files:  
     
     - jquery.mobile.multiview.js - plugin  
     - jquery.mobile.multiview.css - css  
     - jquery.mobile-1.0.1multiview - Jquery Mobile with slight modifications  

2. Current Status  
I have rewritten parts of the plugin trying to get by without having to modify Jquery Mobile. Slowly progressing... With the upcoming JQM 1.1. I will need to rewrite the popover part of the plugin, because right now popovers just tap into the fixed toolbar routine, so they reposition as you scroll.   
As JQM 1.1 will switch to position fixed, I will need to redo the popover positioning. 

 Other than that the plugin is coming along. Panel transitions are now running without touching JQM except for adding pageContainer as changePage option, which also reduces duplicate code inside the 
plugin considerably. I'm still looking for a way to do the same to hashchange navigation.

3. Setup  
   - start with a regular JQM page
   - add data-wrapper="true" to this page and other pages you want to run the plugin on. Multiview runs in a single instance, so if you pull in a page into the DOM labelled with data-wrapper="true" it will also be "plugged".
   - add your panels inside(!) this page.

4. Panel Layouts  
 a) **Plain Popovers** - your page should look like this:
   
	    header
	    content 
	    popover 1
	      nested pages
	    popover 2
	      nested pages
	    ... 
	    footer 
    
			
 b) **Fullwidth panel** (and popovers) = **a true multipage** - your page should look like this:

            header
	    fullwidth panel
	         nested pages
	    popover 1
	         nested pages
	    popover 2
	         nested pages
	    ... 
	    footer

 c) **Splitscreen menu/main** (and popovers) - your page should look like this:

	    header
	    menu panel
	        nested pages
	    main panel
	        nested pages
	    popover 1
	        nested pages
	    popover 2
	        nested pages
	    ... 
	    footer

5. Attributes:  
A run-through of all attributes, where to specify and what they do:

a) general  
<TABLE cellspacing="2" border="1">
<tr>
<td>data-wrapper="true"</td><td>REQUIRED on div-page</td><td>put this on your wrapper page to fire the plugin</td>
</tr>
<tr>
<td>data-role="panel"</td>
<td>REQUIRED on div-panel</td>
<td>tells the plugin this ... is a panel</td>
</tr>
<tr>
<td>data-id="your_panel_name"</td>
<td>REQUIRED on div-panel</td>
<td>the name of your panel </td>
</tr>
<tr>
<td>data-panel="panel_type"</td>
<td>REQUIRED on div-panel</td>
<td>type of panel "fullwidth", "menu", "main" or "popover"</td>
</tr>
<tr>
<td>data-hash="history"</td>
<td>optional on div-panel</td>
<td>add this if you want to have a panel history (not perfect yet!)</td>
</tr>
<tr>
<td></td>
<td></td>
<td></td>
</tr>
</TABLE>

b) on the menu

<TABLE cellspacing="2" border="1">
<tr>
<td>data-switchable="true"</td>
<td>optional on div-menu</td>
<td>toggle the menu in splitview mode (default false)</td>
</tr>
<tr>
<td>data-switchableHideOnLoad="true"</td>
<td>optional on div-menu</td>
<td>hide the toggle menu when the page loads (default false)</td>
</tr>
<tr>
<td>data-menu-text="text"</td>
<td>optional on div-menu</td>
<td>text for the menu button shown in popover mode, which opens/hides the menu, default "menu" </td>
</tr>
<tr>
<td>data-menu-iconpos="yourIconpos"</td>
<td>optional on div-menu</td>
<td>iconpos for the menu button shown in popover mode, default "left"</td>
</tr>
<tr>
<td>data-menu-theme="your_theme"</td>
<td>optional on div-menu</td>
<td>theme for the menu button shown in popover mode, default "a"</td>
</tr>
<tr>
<td>data-menu-icon="search"</td>
<td>optional on div-menu</td>
<td>icon for the menu button shown in popover mode, default "search"</td>
</tr>
</table>

c) on panel pages

<TABLE cellspacing="2" border="1">
<tr>
<td>data-show="first"</td>
<td>REQUIRED on div-page</td>
<td>tell the plugin which page to show first on a panel. Omit this if you want a blank panel</td>
</tr>
</table>
 
d) on popovers
<TABLE cellspacing="2" border="1">
<tr>
<td>data-show="once"</td>
<td>optional on div-popover</td>
<td>show this popover once the first time this page is loaded (think login popover)</td>
</tr>
</table>		
	
e) used in methods(!)
<TABLE cellspacing="2" border="1">
<tr>
<td>data-panel="panel-data-id"</td>
<td>REQUIRED on links</td>
<td>sets $.mobile.pageContainer from body to panel before transitions. That's where your transition will go to</td>
</tr>
<tr>
<td colspan="3">to call a transition programmatically add the respective panel as pageContainer option  
 example: $.mobile.changePage('#pageo', {transition: 'slide', pageContainer: $('div:jqmData(id="your_panel_ID")') });
 to open a popover panel, create a link with href="#", data-panel="popover" and a class of .toggle__popover  
 example: a href="#" data-transition="pop" data-role="button" data-panel="popoverShow" class="toggle_popover"</td>
</tr>
<tr>
<td>data-context</td>
<td>REQUIRED on context links</td>
<td>add this if you want a context transition = changePage on panel A and change corresponding page on panel B</td>
</tr>
<tr>
<td>data-context-panel</td>
<td>REQUIRED on context links</td>
<td>add this to tell JQM where your context transition should go to</td>
</tr>
</table>

f) Bonus  
<TABLE cellspacing="2" border="1">
<tr>
<td>data-type="horizontal"</td>
<td>optional on collapsible-set</td>
<td>still working on it. Add this to make change a collapsible-set into a horizontal tab viewer</td>
</tr>
<tr>
<td>.iconposSwitcher-a</td>
<td colspan="2">optional on a-buttons			changes buttons to icon-only on smartphones</td>

</tr>
<tr>
<td>.iconposSwitcher-div</td>
<td>optional on input-buttons</td>
<td>changes buttons to icon-only on smartphones</td>
</tr>
</table>						



6. Please also note:
 - I'm using 3 screen modes: >768 = splitview, >468 = popover, <468 = fullscreen
 - in fullscreen mode, all popovers are changed to fullsize JQM pages, opening a popover in fullscreen pop-transition a regular JQM page. 
 - scrollview is only used for popovers in splitview and popver mode. 
 - the history plays nice as long as all pages are on board. Once you start to load in external pages, things still get messy.
 - you will get automatic back buttons on all panels, which have data-history="hash". these work fine.
 - I had deeplinking working for "onboard" pages, but something is broken with JQM 1.0.1. - still searching
 - for deeplinking external pages ("offboard"), I'm thinking about a sitemap option - otherwise the plugin does which panel external.html goes to
 - I'm still tinkering with another layout mode for smartphones, in which the menu is shown first and the main panel is the next page being shown. 
 - if you want to fill up your header with buttons7form elements etc, add .headWrapRight and .headWrapLeft to your header and drop your elements - all snuggly aligned (I recommend using iconposSwitcher-a/div on all buttons in a crammed header) 
 - You should be able to use a global header/footer (on wrapper), local header/footer (on nested pages) or any mix you like. Not sure if this works ok anymore though.
 - Multiview should work with forms, Photoswipe, (tweaked Pagination). 

That's it. Hope you enjoy the plugin. 

I'm not progressing as fast as I would like (need to earn my living, too), but please go ahead and post issues. I will try to work on them whenever possible.
