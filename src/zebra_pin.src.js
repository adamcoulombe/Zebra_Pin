/**
 *  Zebra_Pin
 *
 *  Zebra_Pin is a lightweight (2.5KB minified, ~800 bytes gzipped) and adaptive (things work as expected when the browser
 *  window is resized) jQuery plugin for pinning elements to the page or to a container element, so that pinned elements
 *  remain visible when they are about to be scrolled out of view. This type of elements are also referred to as "fixed
 *  position elements" or "sticky elements".
 *
 *  Use it to create sticky sidebars, sticky navigation, sticky headers and footers, or anything else you feel the need
 *  to make it stick to the page while the user scrolls.
 *
 *  You can have "hard" pinned elements - elements are pinned to their initial position and stay there, elements that
 *  become pinned when they are about to be scrolled out of view, as well as pinned elements that can move only inside
 *  their parent element's boundaries.
 *
 *  Pinned elements are added a user-defined CSS class so you can adjust their looks when pinned. Additionally, custom
 *  events are fired when elements become pinned/unpinned giving you even more power for customizing the result.
 *
 *  Works in pretty much any browser - Firefox, Chrome, Safari, Edge, Opera and Internet Explorer 7+
 *
 *  Read more {@link https://github.com/stefangabos/Zebra_Pin/ here}
 *
 *  @author     Stefan Gabos <contact@stefangabos.ro>
 *  @version    2.0.0 (last revision: July 20, 2018)
 *  @copyright  (c) 2013 - 2018 Stefan Gabos
 *  @license    http://www.gnu.org/licenses/lgpl-3.0.txt GNU LESSER GENERAL PUBLIC LICENSE
 *  @package    Zebra_Pin
 */
 (function($) {

    'use strict';

    $.Zebra_Pin = function(elements, options) {

        // so you can tell the version number even if all you have is the minified source
        this.version = '2.0.0';
        var pluginUpdateTimeout=null;

        var defaults = {

                //  class to add to the element when it is becomes pinned
                class_name: 'Zebra_Pin',

                //  specifies whether the pinned element should be restricted to its parent element's boundaries or not.
                //
                //  default is FALSE
                contain: false,

                //  specifies whether the element should be "hard" pinned (pinned to its position from the beginning), or
                //  become pinned only when it is about to go out of view.
                //
                //  default is FALSE
                hard: false,

                //  distance, in pixels, from the browser window's top (or the container element's top, when element is
                //  contained to its parent element's boundaries) from which the element should become pinned.
                //  this only works if the "hard" property is set to FALSE.
                //
                //  default is 0
                top_spacing: 0,

                //  value, in pixels, that adjusts the point at which the element gets pinned. Can be positive or negative
                //
                //  default is 0
                pinpoint_offset:0,

                //  distance, in pixels, from the containing parent element's bottom which the pinned element must not
                //  exceed.
                //  this only works if the "hard" property is set to FALSE and the "contain" property is set to TRUE
                //
                //  default is 0
                bottom_spacing: 0,

                //  the value of zIndex CSS property to be set for pinned elements
                //  default is 1000
                z_index: 1000,

                //  callback function to be executed when an element becomes pinned
                //  the callback function receives 3 arguments:
                //  -   the vertical position, relative to the document, where the event occurred
                //  -   a reference to the pinned element
                //  -   the index of the element - if the plugin was attached to multiple elements (0 based)
                onPin: null,

                //  callback function to be executed when an element becomes unpinned (reverts to its original state)
                //  the callback function receives 3 arguments:
                //  -   the vertical position, relative to the document, where the event occurred
                //  -   a reference to the unpinned element
                //  -   the index of the element - if the plugin was attached to multiple elements (0 based)
                onUnpin: null

            },

            // to avoid confusions, we use "plugin" to reference the current instance of the object
            plugin = this,

            // generate a unique id to use for easily binding/unbinding events and not interfere with other instances of the plugin
            uniqueid = (Math.random() + 1).toString(36).substring(2, 7),

            // reference to the window element
            $window = $(window),

            /**
             *  Constructor method. Initializes the plugin.
             *
             *  @return void
             */
            _init = function() {

                // the plugin's final properties are the merged default and
                // user-provided options (if any)
                plugin.settings = $.extend({}, defaults, options);

                // update elements' position
                plugin.update();

                // on window resize
                $window.on('resize', function() {

                              
                    clearTimeout(pluginUpdateTimeout);
                        pluginUpdateTimeout = setTimeout(function(){
                        plugin.update();
                    },50)
                });



                // Demo: http://jsfiddle.net/pFaSx/
                // window.onresize isn't triggered when after JavaScript DOM manipulation page becomes high enough for appearing scrollbar.
                // add a 100% width invisible iframe to the page and listen for resize events on it's internal window.
                // Create an invisible iframe
                if(!document.getElementById('hacky-scrollbar-resize-listener')){
                    var iframe = document.createElement('iframe');
                    iframe.id = "hacky-scrollbar-resize-listener";
                    iframe.style.cssText = 'height: 0; opacity:0; background-color: transparent; margin: 0; padding: 0; overflow: hidden; border-width: 0; position: absolute; width: 100%;';
    
                    // Register our event when the iframe loads
                    iframe.onload = function() {
                    // The trick here is that because this iframe has 100% width 
                    // it should fire a window resize event when anything causes it to 
                    // resize (even scrollbars on the outer document)
                    iframe.contentWindow.addEventListener('resize', function() {
                        try {
                        var evt = document.createEvent('UIEvents');
                        evt.initUIEvent('resize', true, false, window, 0);
                        window.dispatchEvent(evt);
                        } catch(e) {}
                    });
                    };
    
                    // Stick the iframe somewhere out of the way
                    document.body.appendChild(iframe);
                }




            };

        /**
         *  Updates the pinned elements' positions in accordance with the scrolled amount and with the pinned elements'
         *  container elements (if any).
         *
         *  Useful if a pinned element's parent changes height.
         *
         *  <code>
         *  // initialize the plugin
         *  var zp = new Zebra_Pin($('#my_pinned_element'), {
         *      // element can move only inside
         *      // the parent element
         *      'contain':  true
         *  });
         *
         *  // if the parent element's height changes
         *  // update also the boundaries
         *  zp.update();
         *  </code>
         *
         *  @return void
         */
        plugin.update = function() {

            // iterate through elements that need to be pinned
            elements.each(function(index) {

                // reference to the current element
                var $element = $(this);

                // if the element is already pinned
                if ($(this).hasClass(plugin.settings.class_name)) {

                    // reset the element's default properties
                    $element.attr('style', $element.data('ztt_previous_style') || '').removeClass(plugin.settings.class_name).removeClass('Zebra_Pin_Contained');

                    // remove the clone element, if it exists
                    $element.next('.Zebra_Pin_Clone').remove();

                }

                var

                    // get the element's position relative to the document
                    offset = $element.offset(),

                    // get the element's position relative to the parent element
                    position = $element.position(),

                    // get the element's height, including padding and border
                    height = $element.outerHeight(),

                    // get the element's width, including padding and border
                    width = $element.outerWidth(),

                    // get margins, if any; we need this because position() takes margins into account while offset()
                    // doesn't and so we need to compensate
                    // see http://bugs.jquery.com/ticket/11606
                    margin_left = (parseInt($element.css('marginLeft'), 10) || 0),
                    margin_top = (parseInt($element.css('marginTop'), 10) || 0),

                    // we'll use these later on, if the pinned element needs to be contained in the parent element
                    $container, container_height, container_offset,

                    proxy;

                // adjust offset with margins
                offset.left -= margin_left;
                offset.top -= margin_top;

                // if element needs to be contained inside the parent element's boundaries
                if (plugin.settings.contain) {

                    // reference to the parent element
                    $container = $element.parent();

                    // get parent element's height
                    container_height = $container.height();

                    // get parent element's position relative to the document
                    container_offset = $container.offset();

                }

                // if element is "hard" pinned (the element is pinned to its position from the beginning)
                if (plugin.settings.hard)

                    // set element's CSS properties
                    $element.css({

                        position:   'fixed',
                        left:       offset.left,
                        top:        offset.top,
                        width:      width,
                        zIndex:     plugin.settings.z_index

                    // add a class indicating that the element is pinned
                    }).addClass(plugin.settings.class_name);

                // if element is not "hard" pinned
                else {

                    // we generate a unique namespace for each element of each instance of the plugin
                    // we do this so that we can easily unbind them without affecting other elements
                    // and instances of the plugin
                    proxy = '.Zebra_Pin_' + uniqueid + '_' + index;

                    // unbind a previously set handler and attach a new one
                    $window.off('scroll' + proxy).on('scroll' + proxy, function() {

                        // get scrolled amount
                        var scroll = $window.scrollTop();

                        // if
                        if (

                            // the user scrolled past the element's top (minus "top_spacing")
                            scroll >= offset.top - plugin.settings.top_spacing + plugin.settings.pinpoint_offset   &&

                            // AND
                            (

                                // the element is not "contained"
                                !plugin.settings.contain ||

                                // OR the element is contained but its bottom didn't reach the container's bottom
                                (scroll <= container_offset.top + container_height - plugin.settings.top_spacing - height - plugin.settings.bottom_spacing)

                            // AND
                            ) && (

                                // the element does not have the class indicating that it is pinned
                                !$element.hasClass(plugin.settings.class_name) ||

                                // OR the element has the class indicating that it is pinned, but it also contains the
                                // "Zebra_Pin_Contained" meaning that the user is now scrolling upwards and that the
                                // element's bottom is *not* touching its container's bottom anymore
                                $element.hasClass('Zebra_Pin_Contained')

                            )

                        ) {

                            // if element is *not* contained and at the bottom of its container
                            if (!$element.hasClass('Zebra_Pin_Contained')) {
                                // create a clone of the element, insert it right after the original element and make it invisible
                                // we do this so that we don't break the layout by removing the pinned element from the DOM
                                $element.clone().addClass('Zebra_Pin_Clone').insertAfter($element).css('visibility', 'hidden')
                                    .attr('id',$element.attr('id')+'_Zebra_Clone')
                                    .find('[id]').each(function(){
                                        $(this).attr('id', $(this).attr('id')+'_Zebra_Clone')
                                    });
                                
                                // save the element's "style" attribute as we are going to modify it
                                // and add class indicating that the element is pinned
                                $element.data('ztt_previous_style', $element.attr('style')).addClass(plugin.settings.class_name);

                                // if a callback function exists for when pinning an element
                                if (plugin.settings.onPin && typeof plugin.settings.onPin === 'function')

                                    // execute the callback function and pass as arguments the scrolled amount, the element
                                    // the plugin is attached to, and the index of the element from the list of elements the
                                    // plugin is attached to
                                    plugin.settings.onPin(offset.top - plugin.settings.top_spacing, $element, index);

                            // if the user is now scrolling upwards and a "contained" element's bottom is *not* touching
                            //  its container's bottom anymore
                            } else

                                // remove this class
                                $element.removeClass('Zebra_Pin_Contained');

                            // set the element's CSS properties
                            $element.css({
                                position:   'fixed',
                                left:       offset.left,
                                top:        plugin.settings.top_spacing,
                                width:      width,
                                zIndex:     plugin.settings.z_index
                            });

                        // else if
                        } else if (

                            // the user scrolled up past the element's top (minus "top_spacing")
                            scroll < offset.top - plugin.settings.top_spacing &&

                            // and the element was pinned
                            $element.hasClass(plugin.settings.class_name)

                        ) {

                            // remove the clone element
                            $element.next('.Zebra_Pin_Clone').remove();

                            // reset the element's original "style" attribute and remove the class indicating that the element is pinned
                            $element.attr('style', $element.data('ztt_previous_style') || '').removeClass(plugin.settings.class_name);

                            // if a callback function exists for when unpinning an element
                            if (plugin.settings.onUnpin && typeof plugin.settings.onUnpin === 'function')

                                // execute the callback function and pass as arguments the scrolled amount, the element
                                // the plugin is attached to, and the index of the element from the list of elements the
                                // plugin is attached to
                                plugin.settings.onUnpin(offset.top - plugin.settings.top_spacing, $element, index);

                        // else if
                        } else if (

                            // the element needs to be contained inside the parent element's boundaries
                            plugin.settings.contain &&

                            // the user scrolled past the container element's bottom
                            scroll >= container_offset.top + container_height - plugin.settings.top_spacing - height - plugin.settings.bottom_spacing &&

                            // the element is missing the class indicating that it reached the container element's bottom
                            !$element.hasClass('Zebra_Pin_Contained')

                        ) {

                            // if we didn't have the chance to initialize the pin
                            // (when the page doesn't start at the top)
                            if (!$element.hasClass(plugin.settings.class_name)) {
                                // create a clone of the element, insert it right after the original element and make it invisible
                                // we do this so that we don't break the layout by removing the pinned element from the DOM
                                $element.clone().addClass('Zebra_Pin_Clone').insertAfter($element).css('visibility', 'hidden')
                                    .attr('id',$element.attr('id')+'_Zebra_Clone')
                                    .find('[id]').each(function(){
                                        $(this).attr('id', $(this).attr('id')+'_Zebra_Clone')
                                    });

                                // save the element's "style" attribute as we are going to modify it
                                // and add class indicating that the element is pinned
                                $element.data('ztt_previous_style', $element.attr('style')).addClass(plugin.settings.class_name);

                                // if a callback function exists for when pinning an element
                                if (plugin.settings.onPin && typeof plugin.settings.onPin === 'function')

                                    // execute the callback function and pass as arguments the scrolled amount, the element
                                    // the plugin is attached to, and the index of the element from the list of elements the
                                    // plugin is attached to
                                    plugin.settings.onPin(offset.top - plugin.settings.top_spacing, $element, index);

                            }

                            // set element's CSS properties
                            $element.css({

                                position:   'absolute',
                                left:       position.left,
                                top:        container_height - height - plugin.settings.bottom_spacing - plugin.settings.bottom_spacing

                            // add a class indicating that the element reached the container element's bottom
                            }).addClass('Zebra_Pin_Contained');

                        }

                    });

                    // trigger the scroll event so that the computations take effect
                    $window.trigger('scroll' + proxy);

                }

            });

        };

        plugin.settings = {};

        // off we go!
        _init();

    };

})(jQuery);
