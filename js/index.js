const height = 720;
const width = height * 1.25;

const log = $("#log");
const input = $("#input");
const neighborhoodPopover = $("#neighborhoodPopover");
// Whenever this form has a submit event,
$("form").submit(function (event) {
    // prevent form from redirecting/making a request and do this instead
    event.preventDefault();

    // Creates FormData object and sticks file in there
    let formData = new FormData();
    let input_text = input.val();
    formData.append("meow", input_text);

    // Makes a POST request to the uploader endpoint
    // If successful, tell user file was uploaded successfully and clear #file_input
    // Else, tell user it failed
    $.get('model/'+ input_text, function(data){

    }).done(function(response) {
        console.log(response);
        log.text("Request was uploaded successfully.");
        input.val(null);;
    }).fail(function() {
        log.text("The request failed.");
    });
});

// $.get("nyc.json").then(function(nyc){
d3.json(window.location.href + "/static/nyc.json").then(function(nyc) {

mapboxgl.accessToken = 'pk.eyJ1IjoidGFuazc2NSIsImEiOiJjazJ5ZHNndDgwNzI0M2JxdGZpaHh6OTFyIn0.NbINRMNm2chbLryFxoWCtg';
map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.0060, 40.7108],
    zoom: 9,
    minZoom: 9,
    maxZoom: 15,
    maxBounds: new mapboxgl.LngLatBounds(
      new mapboxgl.LngLat(-74.41798730468805, 40.49183755125762),
      new mapboxgl.LngLat(-73.59401269531324, 40.92904478186287)
    )
});

map.addControl(new mapboxgl.NavigationControl());

map.on('load', function(){
    layer = map.addLayer({
        'id':'neighborhoods',
        'type': 'fill',
        'source': {
            'type': 'geojson',
            'data': nyc
        },
        'layout':{},
        'paint': {
            'fill-color': '#B0DE5C',
            'fill-opacity': 0.65,
            'fill-outline-color': '#000'
        }
    });
});
// The super helpful example
// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/

map.on("mousemove", "neighborhoods", function(e) {
    console.log(e);
    console.log(e.features);
    neighborhoodPopover.css("left", e.originalEvent.pageX + "px");
    neighborhoodPopover.css("top", e.originalEvent.pageY + "px");
    neighborhoodPopover.css("opacity", 1);
    neighborhoodPopover.css("z-index", 1);
    neighborhoodPopover.text(e.features[0].properties.neighborhood);
    // if (e.features.length > 0) {
    // if (hoveredStateId) {
    // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: false});
    // }
    // hoveredStateId = e.features[0].id;
    // map.setFeatureState({source: 'states', id: hoveredStateId}, { hover: true});
    // }
    });

map.on("mouseleave", "neighborhoods", function(e){
    console.log(e);
    console.log(e.features); // There's no e.features on mouseleave
    neighborhoodPopover.css("opacity", 0);
});

});