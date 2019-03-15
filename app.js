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
                this.wwd.layers.forEach(function(item) {
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
        self.loadLayers = function(layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the layer panel's buttons
        self.toggleLayer = function(layer) {
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
        self.loadLayers = function(layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the setting panel's buttons
        self.toggleLayer = function(layer) {
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
            console.log(observableArray);
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
    // let globe = new WorldWind.WorldWindow("canvas-globe");
    let globe = new Globe("canvas-globe");
    // Add layers to the globe
    // Add layers ordered by drawing order: first to last
    globe.addLayer(new WorldWind.BMNGLayer(), {
        category: "base"
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
        enabled: false,
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
        enabled: false
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
        displayName: "no"
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
    $('.navbar-collapse a[role="button"]').click(function() {
        $('.navbar-collapse').collapse('hide');
    });

    // Collapse card ancestors when the close icon is clicked
    $('.collapse .close').on('click', function() {
        $(this).closest('.collapse').collapse('hide');
    });

    // Tell World Wind to log only warnings.
    // WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

    // Create the World Window.
    // var globe = new WorldWind.WorldWindow("canvas-globe");

    // Add standard imagery layers.
    var layerss = [
        {layer: new WorldWind.BMNGLayer(), enabled: true},
        {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
        {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
        {layer: new WorldWind.CompassLayer(), enabled: true},
        {layer: new WorldWind.CoordinatesDisplayLayer(globe), enabled: true},
        {layer: new WorldWind.ViewControlsLayer(globe), enabled: true}
    ];

    for (var l = 0; l < layerss.length; l++) {
        layerss[l].layer.enabled = layerss[l].enabled;
        globe.addLayer(layerss[l].layer);
    }

    

    var laname,
        j,
        loca,
        locat,
        col,
        colo;

    var LayerInfo = [], CoordinateLatInfo = [], CoordinateLongInfo = [], listLoca = [];

    // This wmsLayer used to be switch_right but it's different on this project so I changed it
    $("input:checkbox").change(function() {
        var CurrentToggleVal = $(this).val();
        console.log("Initial:" + layerss.length);
        console.log(CurrentToggleVal);

        for (var b = 0; b < layerss.length; b++) {
            if (layerss[b].displayName === CurrentToggleVal) {

                if ($(this).prop('checked')) {
                    console.log("open");
                    layerss[b].enabled = true;

                } else {
                    console.log("closed");
                    layerss[b].enabled = false;

                }
                break;

            } else {
                if (b === layerss.length - 1) {
                    console.log("new");

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
                                console.log("Ending Loop:" + layerss.length);
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
    };

    // Now set up to handle highlighting.
    var highlightController = new WorldWind.HighlightController(globe);

    var sitePopUp = function(jsonobj) {
        var sitename, sitedesc, picpath, siteurl;
        var latlong = jsonobj.latitude + "," + jsonobj.longitude;
        var popupBodyItem = $("#modalBody");
        $(popupBodyItem).children().remove();

        for (var z = 0; z < LayerInfo.length; z++) {

            if (listLoca[z] === latlong) {
                sitename = LayerInfo[z].Site_Name;
                picpath = "../images/Placemark_Images/" + LayerInfo[z].Picture_Location;
                sitedesc = LayerInfo[z].Site_Description;
                siteurl = LayerInfo[z].Link_to_site_Location;
                break;
            }
        }

        //Insert site information into indexTest.html.
        var popupBodyName = $('<p class="site-name"><h4>' + sitename + '</h4></p>');
        var popupBodyDesc = $('<p class="site-description">' + sitedesc + '</p><br>');
        var popupBodyImg = $('<img class="site-img" src="' + picpath + '" width=100% height=auto /><br>');
        var popupBodyURL = $('<p class="site-URL">Please click <a href="' + siteurl + '" target="_blank"><span id="href"><b>here</b></span></a> for more detailed information</p>');

        popupBodyItem.append(popupBodyName);
        popupBodyItem.append(popupBodyDesc);
        popupBodyItem.append(popupBodyImg);
        popupBodyItem.append(popupBodyURL);
    };

    var handleMouseCLK = function (o) {

        // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
        // the mouse or tap location.
        var x = o.clientX,
            y = o.clientY;

        // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
        // relative to the upper left corner of the canvas rather than the upper left corner of the page.

        //This is the the Popup Box coordinate finder
        var pickList = globe.pick(globe.canvasCoordinates(x, y));
        // console.log(pickList.objects[0]);
        for (var q = 0; q < pickList.objects.length; q++) {
            var pickedPL = pickList.objects[q].userObject;
            // console.log (pickedPL);
            if (pickedPL instanceof WorldWind.Placemark) {
                console.log (pickedPL.position.latitude);
                sitePopUp(pickedPL.position);
                //alert("It Worked");

                $(document).ready(function () {
                    // console.log("It's connected");
                    // Get the modal
                    var modal = document.getElementById('myModal');

                    // Get the <span> element that closes the modal
                    var span = document.getElementsByClassName("close")[0];

                    // When the user clicks the button, open the modal

                    modal.style.display = "block";

                    // When the user clicks on <span> (x), close the modal
                    span.onclick = function() {
                        modal.style.display = "none";
                    };

                    // When the user clicks anywhere outside of the modal, close it
                    window.onclick = function(event) {
                        if (event.target == modal) {
                            modal.style.display = "none";
                        }
                    };
                })
            }
        }
    };

    // Listen for mouse double clicks placemarks and then pop up a new dialog box.
    globe.addEventListener("click", handleMouseCLK);

    // Listen for taps on mobile devices and then pop up a new dialog box.
    var tapRecognizer = new WorldWind.TapRecognizer(globe, handleMouseCLK);
});
