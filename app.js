$(document).ready(function() {
    "use strict";

    // Set the Bing API key for Bing Maps
    // Without your own key you will be using a limited WorldWind developer's key.
    // See: https://www.bingmapsportal.com/ to register for your own key and then enter it below:
    const BING_API_KEY = "";
    if (BING_API_KEY) {
        // Initialize WorldWind properties before creating the first WorldWindow
        WorldWind.BingMapsKey = BING_API_KEY;
    } else {
        console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
    }


    /**
     * The Globe encapsulates the WorldWindow object (wwd) and provides application
     * specific logic for interacting with layers.
     * @param {String} canvasId The ID of the canvas element that will host the globe
     * @returns {Globe}
     */

    class Globe {
        constructor(canvasId) {

            // Create a WorldWindow globe on the specified HTML5 canvas
            this.wwd = new WorldWind.WorldWindow(canvasId);
            // this.globe = new WorldWind.WorldWindow(canvasId);

            // Holds the next unique id to be assigned to a layer
            this.nextLayerId = 1;

            this.baseURL = "./images/Placemark_Images";

            // Holds a map of category and observable timestamp pairs
            this.categoryTimestamps = new Map();


            // Add a BMNGOneImageLayer background layer. We're overriding the default
            // minimum altitude of the BMNGOneImageLayer so this layer always available.
            this.addLayer(new WorldWind.BMNGOneImageLayer(), {
                category: "background",
                minActiveAltitude: 0
            });

        }

        /**
         * Returns an observable containing the last update timestamp for the category.
         * @param {String} category
         * @returns {Observable}
         */
        getCategoryTimestamp(category) {
            if (!this.categoryTimestamps.has(category)) {
                this.categoryTimestamps.set(category, ko.observable());
            }
            return this.categoryTimestamps.get(category);
        }

        /**
         * Updates the timestamp for the given category.
         * @param {String} category
         */
        updateCategoryTimestamp(category) {
            let timestamp = this.getCategoryTimestamp(category);
            timestamp(new Date());
        }

        /**
         * Toggles the enabled state of the given layer and updates the layer
         * catetory timestamp. Applies a rule to the 'base' layers the ensures
         * only one base layer is enabled.
         * @param {WorldWind.Layer} layer
         */
        toggleLayer(layer) {

            // Multiplicity Rule: only [0..1] "base" layers can be enabled at a time
            if (layer.category === 'base') {
                this.wwd.layers.forEach(function (item) {
                    if (item.category === 'base' && item !== layer) {
                        item.enabled = false;
                    }
                });
            }
            // Toggle the selected layer's visibility
            layer.enabled = !layer.enabled;
            // Trigger a redraw so the globe shows the new layer state ASAP
            this.wwd.redraw();

            // Signal a change in the category
            this.updateCategoryTimestamp(layer.category);
        }

        /**
         * Adds a layer to the globe. Applies the optional options' properties to the
         * layer, and assigns the layer a unique ID and category.
         * @param {WorldWind.Layer} layer
         * @param {Object|null} options E.g., {category: "base", enabled: true}
         */
        addLayer(layer, options) {
            // Copy all properties defined on the options object to the layer
            if (options) {
                for (let prop in options) {
                    if (!options.hasOwnProperty(prop)) {
                        continue; // skip inherited props
                    }
                    layer[prop] = options[prop];
                }
            }
            // Assign a default category property if not already assigned
            if (typeof layer.category === 'undefined') {
                layer.category = 'overlay'; // the default category
            }

            // Assign a unique layer ID to ease layer management
            layer.uniqueId = this.nextLayerId++;

            // Add the layer to the globe
            this.wwd.addLayer(layer);

            // Signal that this layer category has changed
            this.getCategoryTimestamp(layer.category);
        }

        /**
         * Returns a new array of layers in the given category.
         * @param {String} category E.g., "base", "overlay" or "setting".
         * @returns {Array}
         */
        getLayers(category) {
            return this.wwd.layers.filter(layer => layer.category === category);
        }
    }

    /**
     * View model for the layers panel.
     * @param {Globe} globe - Our globe object
     */
    function LayersViewModel(globe) {
        var self = this;
        self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
        self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('base').subscribe(newValue =>
            self.loadLayers(globe.getLayers('base'), self.baseLayers));

        globe.getCategoryTimestamp('overlay').subscribe(newValue =>
            self.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

        // Utility to load the layers in reverse order to show last rendered on top
        self.loadLayers = function (layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the layer panel's buttons
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };
    }

    /**
     * View model for the settings.
     * @param {Globe} globe - Our globe object (not a WorldWind.Globe)
     */

    function SettingsViewModel(globe) {
        var self = this;
        self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('setting').subscribe(newValue =>
            self.loadLayers(globe.getLayers('setting'), self.settingLayers));

        // Utility to load layers in reverse order
        self.loadLayers = function (layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the setting panel's buttons
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };
    }

    function PlacemarksViewModel(globe) {
        var self = this;
        self.placemarkLayers = ko.observableArray(globe.getLayers('placemark').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('placemark').subscribe(newValue =>
            self.loadLayers(globe.getLayers('placemark'), self.placemarkLayers));

        // Utility to load layers in reverse order
        self.loadLayers = function (layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
            // console.log(observableArray);
        };

        // Click event handler for the setting panel's buttons
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };

        function toggleLayer(placemarks) {
            // Multiplicity Rule: only [0..1] "base" layers can be enabled at a time
            if (layer.category === "placemarks") {
                this.wwd.forEach(function (item) {
                    if (item.category === "placemarks" && item !== placemarks) {
                        item.enabled = false;
                    }
                });
            }
            // Toggle the selected layer's visibility
            placemarks.enabled = !placemarks.enabled;
            // Trigger a redraw so the globe shows the new layer state ASAP
            this.wwd.redraw();

            // Signal a change in the category
            this.updateCategoryTimestamp(placemarks.category);
        }

    }

    // Create a globe
    let globe = new Globe("canvas-globe");
    // let globe = new WorldWind.WorldWindow("canvas-globe");
    // Add layers to the globe
    // Add layers ordered by drawing order: first to last
    globe.addLayer(new WorldWind.BMNGLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
        category: "base",
        enabled: true,
        detailControl: 1.5
    });
    globe.addLayer(new WorldWind.BingRoadsLayer(), {
        category: "overlay",
        enabled: false,
        detailControl: 1.5,
        opacity: 0.75
    });
    globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
        category: "setting"
    });
    globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
        category: "setting"
    });
    globe.addLayer(new WorldWind.CompassLayer(), {
        category: "setting",
        enabled: true
    });
    globe.addLayer(new WorldWind.StarFieldLayer(), {
        category: "setting",
        enabled: true,
        displayName: "Stars"
    });
    globe.addLayer(new WorldWind.AtmosphereLayer(), {
        category: "setting",
        enabled: false,
        time: null // or new Date()
    });
    globe.addLayer(new WorldWind.Layer(), {
        category: "placemark",
        enabled: false,
        displayName: "Potat",
        // value: "no"
    });


    // Create the view models
    let layers = new LayersViewModel(globe);
    let settings = new SettingsViewModel(globe);
    let placemarks = new PlacemarksViewModel(globe);

    // Bind the views to the view models
    ko.applyBindings(layers, document.getElementById('layers'));
    ko.applyBindings(settings, document.getElementById('settings'));
    ko.applyBindings(placemarks, document.getElementById('placemarks'));

    // Auto-collapse the main menu when its button items are clicked
    $('.navbar-collapse a[role="button"]').click(function () {
        $('.navbar-collapse').collapse('hide');
    });

    // Collapse card ancestors when the close icon is clicked
    $('.collapse .close').on('click', function () {
        $(this).closest('.collapse').collapse('hide');
    });

    // Save this WMS Layer Code for Later

    // WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
    //
    // // Web Map Service information from NASA's Near Earth Observations WMS
    // var serviceAddress = "https://neo.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0";
    //
    // var layerName = [];
    // var preloadLayer = [];
    //
    // var Layers = globe.wwd.layers;
    //
    // $(document).ready(function () {
    //     $(".wmsLayer").each(function (i) {
    //         preloadLayer[i] = $(this).val();
    //     });
    //
    //     var strs = preloadLayer + '';
    //
    //     layerName = strs.split(",");
    //
    //     $('.wmsLayer').click(function(){
    //         // console.log (layers);
    //         for (var a = 0; a < Layers.length; a++) {
    //             if ($('.wmsLayer').is(":checkbox:checked")) {
    //                 $(':checkbox:checked').each(function () {
    //                     if (Layers[a].displayName === $(this).val()) {
    //                         Layers[a].enabled = true;
    //                         createWMSLayer();
    //                     }
    //                 });
    //             }
    //
    //             if($('.wmsLayer').is(":not(:checked)")) {
    //                 $(":checkbox:not(:checked)").each(function (i) {
    //                     if (Layers[a].displayName === $(this).val()) {
    //                         Layers[a].enabled = false;
    //                     }
    //                 })
    //             }
    //         }
    //     });
    // });
    //
    // var createWMSLayer = function (xmlDom) {
    //     console.log (layerName);
    //
    //     // Create a WmsCapabilities object from the XML DOM
    //     var wms = new WorldWind.WmsCapabilities(xmlDom);
    //     // Retrieve a WmsLayerCapabilities object by the desired layer name
    //     for (var n = 0; n < layerName.length; n++) {
    //         var wmsLayerCapabilities = wms.getNamedLayer(layerName[n]);
    //         // wmsLayerCapabilities.title = layerName[n];
    //         // Form a configuration object from the WmsLayerCapability object
    //         var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    //         // console.log(n + "Layer: " + layerName[n]);
    //         // Modify the configuration objects title property to a more user friendly title
    //         // wmsConfig.title = layerName[n];
    //         // Create the WMS Layer from the configuration object
    //         var wmsLayer = new WorldWind.WmsLayer(wmsConfig);
    //         // // Add the layers to WorldWind and update the layer manager
    //         globe.wwd.addLayer(wmsLayer);
    //         // layerManager.synchronizeLayerList();
    //     }
    // };
    //
    // // Called if an error occurs during WMS Capabilities document retrieval
    // var logError = function (jqXhr, text, exception) {
    //     console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    // };
    //
    // $.get(serviceAddress).done(createWMSLayer).fail(logError);

    var laname,
        j,
        loca,
        locat,
        col,
        colo;

    var LayerInfo = [], CoordinateLatInfo = [], CoordinateLongInfo = [], listLoca = [], highlightedItems = [];

    // This wmsLayer used to be switch_right but it's different on this project so I changed it
    $('.switch_right').click(function () {
        var CurrentToggleVal = $(this).val();
        // console.log("Initial:" + globe.wwd.layers.length);
        // console.log(CurrentToggleVal);
        for (var b = 0; b < globe.wwd.layers.length; b++) {
            if (globe.wwd.layers[b].displayName === CurrentToggleVal) {

                if ($(this).prop('checked')) {
                    // console.log("open");
                    globe.wwd.layers[b].enabled = true;

                } else {
                    // console.log("closed");
                    globe.wwd.layers[b].enabled = false;

                }
                break;

            } else {
                if (b === globe.wwd.layers.length - 1) {
                    // console.log("new");

                    $.getJSON("LayerNCC.json", function (layer) {
                        for (j = 0; j < layer.length; j++) {
                            if (CurrentToggleVal === layer[j].Layer_Name) {
                                LayerInfo.push(layer[j]);
                                loca = layer[j].Latitude_and_Longitude_Decimal;
                                listLoca.push(loca);
                                locat = loca.split(",");
                                col = layer[j].Color;
                                colo = col.split(" ");
                                laname = layer[j].Layer_Name;
                                CreatePlacemarkLayer(locat, colo, laname);
                                // console.log("Ending Loop:" + globe.wwd.layers.length);
                                // console.log ("displayN last: " + layers[layers.length-1].displayName);

                            }
                        }
                    });
                }
            }
        }
    });

    //This is creating the placemark layer and to connect the placemark to the switch
    var CreatePlacemarkLayer = function (location, pcolor, lname) {
        var placemark;
        var placemarkAttributes;
        var highlightAttributes;

        // Create the placemark.
        placemark = new WorldWind.Placemark(new WorldWind.Position(location[0], location[1], 1e2), false, null);
        //placemark.label = "This is a school" + SitesPL[i].SiteID; // NA,USA,1234
        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

        // Create the custom image for the placemark.
        var canvas = document.createElement("canvas"),
            ctx2d = canvas.getContext("2d"),
            size = 64, c = size / 2 - 0.5, innerRadius = 5, outerRadius = 20;

        canvas.width = size;
        canvas.height = size;

        var gradient = ctx2d.createRadialGradient(c, c, innerRadius, c, c, outerRadius);
        gradient.addColorStop(0, pcolor[0]);
        gradient.addColorStop(0.5, pcolor[1]);
        gradient.addColorStop(1, pcolor[2]);

        ctx2d.fillStyle = gradient;
        ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
        ctx2d.fill();

        // Create the placemark attributes for the placemark.
        placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        // The line of code above used to have a (placemarkAttributes) in the PlacemarkAttributtes
        // Wrap the canvas created above in an ImageSource object to specify it as the placemark image source.
        placemarkAttributes.imageSource = new WorldWind.ImageSource(canvas);
        placemark.attributes = placemarkAttributes;

        var placemarkLayer = new WorldWind.RenderableLayer(lname);
        // var PlacemarkSettings = //Set up the common placemark attributes.
        placemarkAttributes.imageScale = 0.35;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 0.5);
        placemarkAttributes.imageColor = WorldWind.Color.WHITE;

        highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        highlightAttributes.imageScale = 50/100;
        placemark.highlightAttributes = highlightAttributes;

        // Add the placemark to the layer.
        placemarkLayer.addRenderable(placemark);

        placemarkLayer.enabled = true;

        // Add the placemarks layer to the World Window's layer list.
        globe.addLayer(placemarkLayer);

        CoordinateLatInfo.push(placemark.position.latitude);
        CoordinateLongInfo.push(placemark.position.longitude);


        // var pinLibrary = globe.baseURL, // location of the image files
        //     placemark,
        //     placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
        //     highlightAttributes,
        //     placemarkLayer = new WorldWind.RenderableLayer(lname);
        //
        // // Create the custom image for the placemark.
        // var canvas = document.createElement("canvas"),
        //     ctx2d = canvas.getContext("2d"),
        //     size = 64, c = size / 2 - 0.5, innerRadius = 5, outerRadius = 20;
        //
        // canvas.width = size;
        // canvas.height = size;
        //
        // var gradient = ctx2d.createRadialGradient(c, c, innerRadius, c, c, outerRadius);
        // gradient.addColorStop(0, pcolor[0]);
        // gradient.addColorStop(0.5, pcolor[1]);
        // gradient.addColorStop(1, pcolor[2]);
        //
        // ctx2d.fillStyle = gradient;
        // ctx2d.arc(c, c, outerRadius, 0, 2 * Math.PI, false);
        // ctx2d.fill();
        //
        // // Set up the common placemark attributes.
        // placemarkAttributes.imageScale = 0.2;
        // placemarkAttributes.imageOffset = new WorldWind.Offset(
        //     WorldWind.OFFSET_FRACTION, 0.5,
        //     WorldWind.OFFSET_FRACTION, 0.0);
        // placemarkAttributes.imageColor = WorldWind.Color.WHITE;
        // // placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
        // //     WorldWind.OFFSET_FRACTION, 0.5,
        // //     WorldWind.OFFSET_FRACTION, 1.0);
        // // placemarkAttributes.labelAttributes.color = WorldWind.Color.GREEN;
        // placemarkAttributes.drawLeaderLine = true;
        // // placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.BLUE;
        //
        // // for (var u = 0; u < globe.wwd.layers.length; u++) {
        //     console.log("Plants are STEALING the FOOD");
        //     // Create the placemark and its label.
        //     placemark = new WorldWind.Placemark(new WorldWind.Position(location[0], location[1], 1e2), true, null);
        //     console.log(placemark);
        //     placemark.label = lname;
        //     placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        //
        //     // Create the placemark attributes for this placemark. Note that the attributes differ only by their
        //     // image URL.
        //     placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        //     placemarkAttributes.imageSource = pinLibrary + "/NasaLogo.png";
        //     placemark.attributes = placemarkAttributes;
        //     console.log(placemarkAttributes);
        //
        //     // Create the highlight attributes for this placemark. Note that the normal attributes are specified as
        //     // the default highlight attributes so that all properties are identical except the image scale. You could
        //     // instead vary the color, image, or other property to control the highlight representation.
        //     highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        //     highlightAttributes.imageScale = 0.3;
        //     placemark.highlightAttributes = highlightAttributes;
        //
        //     placemarkLayer.addRenderable(placemark);
        //
        //     placemarkLayer.enabled = true;
        //
        //     // Add the placemarks layer to the World Window's layer list.
        //     // globe.addLayer(placemarkLayer);
        //
        //     CoordinateLatInfo.push(placemark.position.latitude);
        //     CoordinateLongInfo.push(placemark.position.longitude);
        //
        //     globe.addLayer(placemarkLayer, {
        //         category: "placemark",
        //         enabled: true,
        //         displayName: "Potatooooo"
        //     });
        //
        // // }
    };

    var sitePopUp = function(jsonobj) {
        var sitename, sitedesc, picpath, siteurl;
        var latlong = jsonobj.latitude + "," + jsonobj.longitude;
        var popupBodyItem = $("#modalBody");
        $(popupBodyItem).children().remove();

        for (var z = 0; z < LayerInfo.length; z++) {

            if (listLoca[z] === latlong) {
                sitename = LayerInfo[z].Site_Name;
                picpath = "./images/Placemark_Images/" + LayerInfo[z].Picture_Location;
                sitedesc = LayerInfo[z].Site_Description;
                siteurl = LayerInfo[z].Link_to_site_location;
                break;
            }
        }

        //Insert site information into indexTest.html.
        var popupBodyName = $('<p class="site-name"><h4>' + sitename + '</h4></p>');
        var popupBodyDesc = $('<p class="site-description">' + sitedesc + '</p><br>');
        var popupBodyImg = $('<img alt="Image" class="site-img" src="' + picpath + '" width=100% height=auto /><br>');
        var popupBodyURL = $('<p class="site-URL">Please click <a href="' + siteurl + '" target="_blank"><span id="href"><b>here</b></span></a> for more detailed information</p>');

        popupBodyItem.append(popupBodyName);
        popupBodyItem.append(popupBodyDesc);
        popupBodyItem.append(popupBodyImg);
        popupBodyItem.append(popupBodyURL);

        // console.log(popupBodyName);
        // console.log(popupBodyDesc);
        // console.log(popupBodyImg);
        // console.log(popupBodyURL);
        // console.log(popupBodyItem);
    };

    var handleMouseCLK = function (o) {

        // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
        // the mouse or tap location.
        var x = o.clientX,
            y = o.clientY;

        // console.log(x);
        // console.log(y);
        // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
        // relative to the upper left corner of the canvas rather than the upper left corner of the page.

        //This is the the Popup Box coordinate finder
        var pickList = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));
        // console.log(pickList.objects[0]);
        for (var q = 0; q < pickList.objects.length; q++) {
            var pickedPL = pickList.objects[q].userObject;
            // Original Code (pickedPL instanceof globe.wwd.layers) New Code (globe.wwd.layers.indexOf(pickedPL) !== -1)
            if (pickedPL instanceof WorldWind.Placemark) {
                // console.log(pickedPL.position);
                sitePopUp(pickedPL.position);
                // alert("It Worked");

                $(document).ready(function () {
                    // console.log("It's connected");
                    // Get the modal
                    var modal = document.getElementById('myModal');

                    // Get the <span> element that closes the modal
                    var span = document.getElementsByClassName("cLose")[0];

                    // When the user clicks the button, open the modal
                    modal.style.display = "block";

                    // When the user clicks on <span> (x), close the modal
                    span.onclick = function() {
                        modal.style.display = "none";
                    };

                    // When the user clicks anywhere outside of the modal, close it
                    window.onclick = function(event) {
                        if (event.target === modal) {
                            modal.style.display = "none";
                        }
                    };
                })
            }
        }
    };

    var handleMouseMove = function (o) {
        // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
        // the mouse or tap location.
        var x = o.clientX,
            y = o.clientY;

        var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items

        // De-highlight any previously highlighted placemarks.
        for (var h = 0; h < highlightedItems.length; h++) {
            highlightedItems[h].highlighted = false;
        }
        highlightedItems = [];

        // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
        // relative to the upper left corner of the canvas rather than the upper left corner of the page.

        var pickList = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));

        // Highlight the items picked by simply setting their highlight flag to true.
        if (pickList.objects.length > 0) {
            for (var p = 0; p < pickList.objects.length; p++) {
                pickList.objects[p].userObject.highlighted = true;

                // Keep track of highlighted items in order to de-highlight them later.
                highlightedItems.push(pickList.objects[p].userObject);

                // Detect whether the placemark's label was picked. If so, the "labelPicked" property is true.
                // If instead the user picked the placemark's image, the "labelPicked" property is false.
                // Applications might use this information to determine whether the user wants to edit the label
                // or is merely picking the placemark as a whole.
                if (pickList.objects[p].labelPicked) {
                    console.log("Label picked");
                }
            }
        }

        // Update the window if we changed anything.
        if (pickList.objects.length > 0) {
            redrawRequired = true;
        }

        if (redrawRequired) {
            globe.wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
        }

        $(document).ready(function () {
            var popover = document.getElementById('myPopover');

            // When the user clicks the button, open the modal
            // popOver.style.display = "block";
            //
            // When the user clicks anywhere outside of the modal, close it
            // window.onclick = function(event) {
            //     if (event.target === modal) {
            //         popOver.style.display = "none";
            //     }
            // };
        });

        var popup = document.getElementById('myPopup');

        // When the user clicks on div, open the popup
        function myFunction() {
            popup.classList.toggle("show");
        }
    };

    // Listen for mouse double clicks placemarks and then pop up a new dialog box.
    globe.wwd.addEventListener("click", handleMouseCLK);

    globe.wwd.addEventListener("mousemove", handleMouseMove);

    $(document).ready(function(){
        $('[data-toggle="popover"]').popover();
    });
});