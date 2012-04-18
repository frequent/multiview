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