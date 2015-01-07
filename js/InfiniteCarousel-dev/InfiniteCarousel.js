"use strict";
/**
 * @author Tommaso Rossino
 * Infinite carousel
 *
 * @param {object}   [params]
 * @param {string}   [params.element]
 * @param {string}   [params.posindicatorAlign]
 * @param {number}   [params.margin]
 * @param {number}   [params.imageHeight]
 * @param {boolean}  [params.hasPosindicator]
 * @param {boolean}  [params.posindicatorInside]
 * @param {string}   [params.posindicatorColor]
 * @param {boolean}  [params.noZoom]
 * @param {boolean}  [params.hasLoop]
 * @param {boolean}  [params.hasLazyLoading]
 * @param {boolean}  [params.hasArrow]
 * @param {boolean}  [params.arrowInside]
 * @param {boolean}  [params.arrowColor]
 * @param {function} [params.complete]
 */
function InfiniteCarousel(params) {
    var self = {},
    /* PARAMS */
        element,
        noZoom,
        margin,
        hasLoop,
        hasArrow,
        arrowInside,
        arrowColor,
        hasPosindicator,
        posindicatorInside,
        posindicatorColor,
        posindicatorAlign,
        hasLazyLoading,
        imageHeight,
        complete,

    /* VARS */
        container,
        panes,
        pane_width,
        pane_count,
        current_pane,
        imgList = [],
        zooming = false,
        callbackHandler = null,
        isInAnimation = false,

    /* PRIVATE */
        isTouchDevice = (/**@return {boolean}*/function ICIsTouchDevice() {
            try {
                document.createEvent("TouchEvent");
                return true;
            } catch (e) {
                return false;
            }
        })(),
        isOldBrowser = (function ICIsOldBrowser(version, comparison) {
            var $div = $('<div style="display:none;"/>').appendTo($('body'));
            $div.html('<!--[if ' + (comparison || '') + ' IE ' + (version || '') + ']><a>&nbsp;</a><![endif]-->');
            var ieTest = $div.find('a').length;
            $div.remove();
            return ieTest;
        })(9, 'lte'),
        resetZoomSmooth,
        getDataAttributes,
        handleHammer,
        lazyLoading,
        crateList,
        createPosindicator,
        createArrow,
        setPaneDimensions,
        createCircle,
        setParams,
        setContainerOffset,
        bind,
        showPane,

    /* PUBLIC */
        showPaneNum,
        next,
        prev,
        resetZoom,
        getCurrentPane,
        getTotalPane,
        getIsCircle,
        refreshCarousel,
        init;

    /* PRIVATE FUNCTION */
    resetZoomSmooth = function ICResetZoomSmooth(img, scale) {
        scale = scale || 1;
        $(img, element).animate({scale: scale, left: 0, top: 0});

        zooming = scale != 1;
    };

    getDataAttributes = function ICGetDataAttributes(node) {
        var obj = [].filter.call(node.attributes, function (at) {
                return /^data-/.test(at.name);
            }),
            objToReturn = {},
            i;

        for (i = 0; i < obj.length; i++) {
            objToReturn[obj[i].name] = obj[i].value;
        }

        return objToReturn;
    };

    handleHammer = function ICHandleHammer(ev) {
        if (zooming) return;
        if (ev.gesture && ev.gesture.touches.length > 1) return;

        var isDragRight = (ev.gesture.direction == Hammer.DIRECTION_RIGHT),
            isDragLeft = (ev.gesture.direction == Hammer.DIRECTION_LEFT);

        switch (ev.type) {
            case 'dragright':
            case 'dragleft':
            case 'swipeleft':
            case 'swiperight':
                if (Math.abs(ev.gesture.deltaX) > Math.abs(ev.gesture.deltaY)) {
                    ev.gesture.preventDefault();
                } else {
                    return;
                }
                break;
        }
        switch (ev.type) {
            case 'dragright':
            case 'dragleft':
                if (!isInAnimation) {
                    /* stick to the finger */
                    var pane_offset = -(100 * current_pane);
                    var drag_offset = ((ev.gesture.deltaX * 100) / panes.width());
                    if (!hasLoop) {
                        /* slow down at the first and last pane */
                        if ((current_pane == 0 && isDragRight) || (current_pane == pane_count - 1 && isDragLeft)) {
                            drag_offset *= .4;
                        }
                    }
                    setContainerOffset({percent: (drag_offset + pane_offset), isAnimate: false});
                } else {
                    if (current_pane == pane_count) {
                        callbackHandler({
                            position: 1,
                            data: getDataAttributes(panes[1])
                        });
                    } else if (current_pane == 0) {
                        callbackHandler({
                            position: pane_count - 2,
                            data: getDataAttributes(panes[pane_count - 2])
                        });
                    } else {
                        callbackHandler({
                            position: pane_count - 2,
                            data: getDataAttributes(panes[current_pane])
                        });
                    }
                    isInAnimation = false;
                }
                break;
            case 'pinch':
                $(element).css({scale: ev.gesture.scale});
                ev.gesture.stopDetect();
                break;
            case 'swipeleft':
                next();
                ev.gesture.stopDetect();
                break;
            case 'swiperight':
                prev();
                ev.gesture.stopDetect();
                break;
            case 'release':
                /* if more then 50% moved, navigate */
                if (Math.abs(ev.gesture.deltaX) > (pane_width / 2)) {
                    if (isDragRight) prev();
                    else next();
                } else {
                    showPane(current_pane, true);
                }
                break;
        }
    };

    lazyLoading = function ICLazyLoading(i) {
        i = i || 0;

        $('.carouselLoaderImage', element).css('height', imageHeight);

        var _img = imgList[i];
        if (_img) {
            var image = new Image();

            image.onload = function ICLazyLoadingImageOnLoad() {
                var $this = $('.carousel-li-pos-' + (i + 1), element),
                    $thisHidden = $('.carousel-li-pos-' + (i + 1) + '-hidden', element);

                $this.html(image);
                if ($thisHidden.length > 0) {
                    $thisHidden.html(image.cloneNode());
                }
                lazyLoading(i + 1);
            };

            image.src = _img;
        }
    };

    /**
     * @return {string}
     */
    crateList = function ICCrateList() {
        var toList = $('> *', element),
            loader = '<div class="carouselLoaderImage"></div>',
            html = '',
            dataAttrs,
            i,
            int;

        if(hasArrow && !arrowInside) html += '<div class="arrowOutside">';

        html += '<ul>';
        for (i = 0; i < toList.length; i++) {
            dataAttrs = getDataAttributes(toList[i]);
            html += '<li';

            for (int in dataAttrs) {
                html += ' ' + int + '="' + dataAttrs[int] + '"';
            }
            html += ' class="carousel-li-pos-' + (i + 1) + '"';
            html += '>';
            if (hasLazyLoading && $(toList[i], element).is('img')) {
                imgList.push($(toList[i], element).data('carousel-lazy-src'));
                html += loader;
            } else {
                html += $(toList[i], element).prop('outerHTML');
            }
            html += '</li>';
        }
        html += '</ul>';

        if(hasArrow && !arrowInside) html += '</div>';

        $(element).html(html);
        return html;
    };

    /**
     * @return {string}
     */
    createPosindicator = function ICCreatePosindicator() {
        var pos_indicator,
            classActive,
            i;

        if ($('.posindicator', element).length === 0) {
            pos_indicator = "<div class='posindicator'>";
            if (panes.length > 1) {
                for (i = 0; i < panes.length; i++) {
                    classActive = i === 0 ? ' active' : '';
                    pos_indicator += '<span data-position="pos-' + (i + 1) + '" class="p' + i + classActive + '"></span>';
                }
            } else {
                pos_indicator = '<div class="clear5"></div>';
            }
            pos_indicator += '</div>';

            $(element).append(pos_indicator);
            $(element).css('position', 'relative');
            container.css('margin-bottom', posindicatorInside ? '0' : '20px');

            $('.posindicator span', element).css('background-color', posindicatorColor);
            $('.posindicator', element).css('text-align', posindicatorAlign);
            $('.posindicator', element).css('bottom', '0');
            if (!isTouchDevice) {
                $('.posindicator span', element).css('width', '15px');
                $('.posindicator span', element).css('height', '15px');
            }
            return pos_indicator;
        }
    };

    /**
     * @return {string}
     */
    createArrow = function ICCreateArrow() {
        /*var html = '<a class="carousel-prev-collection" href=""><div></div></a>' +
            '<a class="carousel-next-collection" href=""><div></div></a>';*/

        var html = '<div class="carousel-prev-collection arrow-left"></div>' +
            '<div class="carousel-next-collection arrow-right"></div>';

        $(element).append(html);
        $('.arrow-left', element).css('border-right-color', arrowColor);
        $('.arrow-right', element).css('border-left-color', arrowColor);
        return html;
    };

    /* set the pane dimensions and scale the container */
    setPaneDimensions = function () {
        pane_width = 100 / pane_count;
        container.width((100 * pane_count) + '%');
        container.css('padding', 'auto ' + margin);
        panes.each(function () {
            $(this).width(pane_width + '%');
        });
        $(panes, element).css({display: 'block'});
    };

    createCircle = function ICCreateCircle() {
        var first = container.find('li:first').clone(),
            isNewFirst = false,
            last = container.find('li:last').clone(),
            isNewLast = false;

        if (first.attr('class').split('-')[first.attr('class').split('-').length - 1] !== 'hidden') {
            isNewFirst = true;
            first.attr('class', first.attr('class') + '-hidden');
        }
        if (last.attr('class').split('-')[last.attr('class').split('-').length - 1] !== 'hidden') {
            isNewLast = true;
            last.attr('class', last.attr('class') + '-hidden');
        }
        if (isNewFirst) {
            pane_count++;
            container.prepend(last);
        }
        if (isNewLast) {
            pane_count++;
            container.append(first);
        }

        panes = $(">li", container);

        showPane(1, true);
    };

    setParams = function ICSetParams(params) {
        element = params['element'];
        noZoom = params['noZoom'];
        margin = params['margin'] || 0;
        hasLoop = params['hasLoop'] || false;
        hasPosindicator = params['hasPosindicator'] || false;
        posindicatorInside = params['posindicatorInside'] || false;
        posindicatorColor = params['posindicatorColor'] || '#ffffff';
        posindicatorAlign = params['posindicatorAlign'] || 'center';
        if (posindicatorAlign !== 'left' && posindicatorAlign !== 'center' && posindicatorAlign !== 'right') {
            posindicatorAlign = 'center';
        }
        hasLazyLoading = params['hasLazyLoading'] || false;
        imageHeight = params['imageHeight'] || 0;
        hasArrow = params['hasArrow'] || false;
        arrowInside = params['arrowInside'] || false;
        arrowColor = params['arrowColor'] || '#ffffff';

        crateList();

        complete = params['complete'];

        container = $("ul", element);
        panes = $(">li", container);

        pane_width = 0;
        pane_count = panes.length;
        current_pane = 0;

        if (pane_count === 1) hasLoop = false;
        else hasLoop = hasLoop ? hasLoop : false;

        if (complete && typeof complete === "function") {
            callbackHandler = complete;
        }
    };

    setContainerOffset = function ICSetContainerOffset(params) {
        if (params['isAnimate'] && !isOldBrowser) {
            isInAnimation = hasLoop ? true : false;
            container.stop().animate(
                {'margin-left': params['percent'] + '%'},
                300,
                'linear',
                function ICSetContainerOffsetAnimate300() {
                    isInAnimation = false;
                    if (typeof params['complete'] === 'function') {
                        params['complete']();
                    }
                }
            );
        } else if (!params['isAnimate'] && !isOldBrowser) {
            container.stop().animate(
                {'margin-left': params['percent'] + '%'},
                0,
                'linear',
                function ICSetContainerOffsetAnimate0() {
                    if (typeof params['complete'] === 'function') {
                        params['complete']();
                    }
                }
            );
        } else {
            if (!params['isAnimate']) {
                container.css('margin-left', params['percent'] + '%');
                if (typeof params['complete'] === 'function') {
                    params['complete']();
                }
            } else {
                container.fadeOut(function ICSetContainerOffsetFade() {
                    container.css('margin-left', params['percent'] + '%');
                    container.fadeIn();
                    if (typeof params['complete'] === 'function') {
                        params['complete']();
                    }
                });
            }
        }
    };

    bind = function ICBind() {
        $(element).hammer({
            drag: true, hold: false, release: true, swipe: true, tap: false, touch: true,
            drag_block_horizontal: true, drag_lock_min_distance: 1, transform: false
        }).on("release dragleft dragright swipeleft swiperight", handleHammer);


        if (!noZoom) {
            $(element).animate({left: 0});
            $(">li img", container).animate({left: 0});
            $(">li", container).hammer().on('pinch drag release doubletap touchmove', 'img', function ICBindHammer(ev) {
                var gesture = ev.gesture || {},
                    scale = gesture.scale * ($(this).data('scale') || 1),
                    x, y, startX, startY,
                    width = $(this).width(),
                    height = $(this).height(),
                    real_width,
                    real_height,
                    x_over,
                    y_over;

                if (scale > 1) {
                    ev.preventDefault();
                    ev.originalEvent && ev.originalEvent.preventDefault();
                    ev.gesture && ev.gesture.preventDefault();
                }

                if (ev.type === 'touchmove') {
                    if (ev.originalEvent.touches.length > 1) {
                        ev.preventDefault();
                    }
                } else if (ev.type === 'pinch') {
                    if (scale > 2) {
                        scale = 2;
                    }

                    if (scale < 1) {
                        scale = 1;
                        zooming = false;
                        $(this).css({x: 0, y: 0});
                    } else {
                        zooming = true;
                    }

                    $(this).css({scale: scale});
                } else if (ev.type === 'doubletap') {
                    if ($(this).css('scale') > 1.4) {
                        resetZoomSmooth(this);
                    } else {
                        resetZoomSmooth(this, 2);
                    }

                } else if (ev.type === 'drag') {
                    scale = +$(this).css('scale') || 1;
                    startX = +$(this).data('x') || 0;
                    startY = +$(this).data('y') || 0;

                    x = startX + ev.gesture.deltaX;

                    real_width = scale * width;
                    x_over = (real_width - width) / 2;

                    y = startY + (ev.gesture.deltaY / scale);
                    real_height = scale * height;
                    y_over = (real_height - height) / 2;

                    if (x > x_over) {
                        x = x_over;
                    } else if (-x > x_over) {
                        x = -x_over;
                    }

                    if (y * scale > y_over) {
                        y = y_over / scale;
                    } else if (-y * scale > y_over) {
                        y = -y_over / scale;
                    }

                    $(this).css({x: x, y: y});
                } else if (ev.type === 'release') {
                    $(this).data('scale', $(this).css('scale'));
                    $(this).data('x', parseInt($(this).css('x')));
                    $(this).data('y', parseInt($(this).css('y')));
                }
            });
        }


        if (hasArrow) {
            $('.carousel-prev-collection', element).on('click', function ICBindPrevArrow(e) {
                e.stopPropagation();
                e.preventDefault();
                prev();
            });

            $('.carousel-next-collection', element).on('click', function ICBindNextArrow(e) {
                e.stopPropagation();
                e.preventDefault();
                next();
            });
        }

        if (hasPosindicator && !isTouchDevice && isOldBrowser) {
            $('.posindicator span', element).on('click', function ICBindPosIndicator(e) {
                var position;

                e.stopPropagation();
                e.preventDefault();
                if (!$(this).hasClass('active')) {
                    position = $(this).data('position');

                    showPaneNum(position.split('pos-')[1]);
                }
            });
        }
    };

    /* PUBLIC FUNCTION */
    /**
     * show pane by index
     * @param {number} index
     * @param {function} skipHandler
     * @param {boolean} isAnimate
     */
    showPane = function ICShowPane(index, skipHandler, isAnimate) {
        var offset;

        resetZoom();
        skipHandler = skipHandler == null ? false : skipHandler;
        isAnimate = isAnimate == null ? true : isAnimate;

        index = Math.max(0, Math.min(index, pane_count - 1));
        current_pane = index;

        offset = -(100 * current_pane);

        setContainerOffset({
            percent: offset,
            isAnimate: isAnimate,
            complete: function ICShowPaneCompleteCallBack() {
                if (hasLoop) {
                    var paneClass = $(panes[getCurrentPane()], element).attr('class');
                    if (paneClass.split('-hidden').length > 1) {
                        showPane(
                            paneClass.split('-hidden')[0].split('-')[paneClass.split('-hidden')[0].split('-').length - 1],
                            true,
                            false
                        );
                    }
                }
                if (!skipHandler && callbackHandler && typeof callbackHandler === "function") {
                    callbackHandler({
                        position: getCurrentPane(),
                        data: getDataAttributes(panes[getCurrentPane()])
                    });
                }
            }
        });

        $('.posindicator span', element).removeClass('active');
        $('span.p' + (index + (hasLoop ? -1 : 0)), element).addClass('active');

        return self;
    };

    /**
     * showPaneNum
     * @param {number} position
     */
    showPaneNum = function ICShowPaneNum(position) {
        if (hasLoop) {
            showPane(position);
        } else {
            showPane(position - 1);
        }
    };

    next = function ICNext() {
        return showPane(current_pane + 1);
    };
    prev = function ICPrev() {
        return showPane(current_pane - 1);
    };

    resetZoom = function ICResetZoom() {
        var $img = $(">li img", container);

        $img.css({x: 0, y: 0, scale: 1});
        $img.data('x', 0);
        $img.data('y', 0);
        $img.data('scale', 1);

        return self;
    };

    /**
     * getCurrentPane
     * @return {number} currentPane
     */
    getCurrentPane = function ICGetCurrentPane() {
        return current_pane;
    };
    /**
     * getTotalPane
     * @return {number} totalPane
     */
    getTotalPane = function ICGetTotalPane() {
        return pane_count;
    };
    /**
     * getIsCircle
     * @return {boolean} hasLoop
     */
    getIsCircle = function ICGetIsCircle() {
        return hasLoop;
    };

    refreshCarousel = function ICRefreshCarousel() {
        setPaneDimensions();
        return self;
    };

    init = function ICInit(params) {
        /*SET PARAMS*/
        if (params) {
            setParams(params);
        }

        if (!$(element).hasClass('carousel')) {
            $(element).addClass('carousel');
        }

        //if lazy loading, use data-carousel-lazy-src instead of src on img tag.
        if (hasLazyLoading)     lazyLoading();
        if (hasPosindicator)    createPosindicator();
        if (hasArrow)           createArrow();
        if (hasLoop)            createCircle();

        setPaneDimensions();
        bind();
        return self;
    };

    self.refreshCarousel = refreshCarousel;
    self.next = next;
    self.prev = prev;
    self.showPane = showPaneNum;
    self.resetZoom = resetZoom;
    self.getCurrentPane = getCurrentPane;
    self.getTotalPane = getTotalPane;
    self.getIsCircle = getIsCircle;
    self.setPaneDimensions = setPaneDimensions;

    return init(params);
}