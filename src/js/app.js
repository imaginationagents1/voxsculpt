var canvas;
var gl;

var leftDown = false;
var rightDown = false;
var lastMouseX = null;
var lastMouseY = null;

var mouseCoord = [];

var _voxSculpt = null;
var _time = null;


//
// start
//
// called when body loads
// sets everything up
//
function start() {

    document.getElementById("overlayTutorial").style.display = "block";

    canvas = document.getElementById("glcanvas");

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    
    initWebGL(canvas);

    // only continue if webgl is working properly
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
        
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.disable(gl.BLEND);

        _voxSculpt = new Voxsculpt();
        _time = new Time();

        _voxSculpt.init();

        initUI();
        
        canvas.onmousedown = handleMouseDown;
        canvas.oncontextmenu = handleRightClick;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;
        document.onmousewheel = handleMouseWheel;
        //document.ontouchstart = handleTouchStart;
        //document.ontouchmove = handleTouchMove;
        document.body.addEventListener('touchmove', function(event) {
            event.preventDefault();
            handleTouchMove(event);
        }, false); 

        document.body.addEventListener('touchstart', function(event) {
            event.preventDefault();
            handleTouchStart(event);
        }, false); 
        
        // start the core loop cycle
        requestAnimationFrame(tick);     
    }
    else
    {
        alert("sorry, your browser/device does not support the webgl compabilities this application needs.")
    }
}


//
// render
//
// Draw the scene.
//
function render( ) 
{ 
    _voxSculpt.render();
}

// 
// tick
//
// core loop function
// called every frame, updates & tells the scene to render
//
function tick( currentTime )
{
    _time.update(currentTime);
    
    resize();

    _voxSculpt.update();
    
    render();

    _voxSculpt.postUpdate();

    requestAnimationFrame( tick );
}


//
// initWebGL
//
// initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initWebGL() {
    gl = null;

    try {
        gl = canvas.getContext("experimental-webgl", { alpha: false });

        var extensions = gl.getSupportedExtensions();
        console.log(extensions);

        gl.getExtension('WEBGL_depth_texture');
    }
    catch(e) {
    }

    // If we don't have a GL context, give up now

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
}


function initUI()
{    
    document.getElementById('fileItem').addEventListener('change', handleLoadImage, false);
}

function tutorialOff()
{
    document.getElementById("overlayTutorial").style.display = "none";
}

function handleLoadImage( evt ) {
   var files = evt.target.files;
   var f = files[0];
   
   var reader = new FileReader();

   console.log("f type: " + f );
    // Only process image files.
    if (f.type.match('image.*')) {
        reader.onload = (function(theFile) {
            return function(e) {
                loadVoxelTexture( e.target.result );
            };
        })(f);

        reader.readAsDataURL(f);
    }
    else if( f.name.endsWith('.vox')) {
        reader.onload = (function(theFile) {
            return function(e) {
                var cubeTexture = gl.createTexture();

                _voxSculpt.handleTextureLoaded(importMagicaVoxel( e.target.result, "" ), cubeTexture );
            };
        })(f);

        reader.readAsArrayBuffer(f);
    }
    


}

function loadVoxelTexture(dataSource) {
    cubeTexture = gl.createTexture();
    cubeImage = new Image();
    cubeImage.onload = function() { _voxSculpt.handleTextureLoaded(cubeImage, cubeTexture); }
    cubeImage.src = dataSource;
}



function resize() 
{

  var displayWidth  = window.innerWidth;
  var displayHeight = window.innerHeight;

  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {

    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    _voxSculpt.handleResize();
  }
}

function handlePointerMove(event, newX, newY, sculpt, rotate, zoomAmount) {
    

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    if( zoomAmount == null )
    {
        zoomAmount = deltaX + deltaY;
    }


    if( zoomAmount )
    {
        _voxSculpt.handleZoom(zoomAmount);
    }
    
    if( rotate )
    {
        _voxSculpt.handleRotate(( deltaX / window.innerWidth ), ( deltaY / window.innerHeight ));
        //console.log("camera forward: " + cameraForward + "     right: " + cameraRight + "  up: " + cameraUp );
    }

    
    if( sculpt)
    {
        var nX = ( newX / window.innerWidth) * 2.0 - 1.0;
        var nY = 1.0 - ( newY / window.innerHeight ) * 2.0;        
        mouseCoord = vec4.fromValues( nX, nY, -1.0, 1.0);       

        _voxSculpt.handleToolUse(nX, nY );
    }

    _voxSculpt.setToolUse(sculpt);


    lastMouseX = newX;
    lastMouseY = newY;
}

function handlePointerStart(event, sculpt, rotate, zoom)
{    
    if( sculpt )
    {
        var nX = ( (lastMouseX / window.innerWidth) ) * 2.0 - 1.0;
        var nY = 1.0 - ( lastMouseY / ( window.innerHeight ) ) * 2.0;
        mouseCoord = vec4.fromValues( nX, nY, -1.0, 1.0);    

        _voxSculpt.handleToolUse(nX, nY );
        
        _voxSculpt.startToolUse(mouseCoord);

        handlePointerMove(event, lastMouseX, lastMouseY, true, false, 0);

        currSculpting = true;
    }
    
}

function handleMouseDown(event) {
    
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    var rightclick;
    if (event.which) rightclick = (event.which == 3);
    else if (event.button) rightclick = (event.button == 2);

    if( rightclick )
    {
        rightDown = true;
    }
    else
    {
        leftDown = true;
    }
    
    var altKey = event.altKey == 1;
    
    var sculpting = (!rightclick && !altKey);
    var rotating = (!rightclick && altKey) || ( rightclick && !altKey);
    var zooming = (rightclick && altKey);
    
    
    handlePointerStart(event, 
        sculpting,
        rotating,
        zooming
    );
}

function handleMouseUp(event) {
    var rightclick;
    if (event.which) rightclick = (event.which == 3);
    else if (event.button) rightclick = (event.button == 2);

    var altKey = event.altKey == 1;
    
    var sculpting = (!rightclick && !altKey);
    var rotating = (!rightclick && altKey) || ( rightclick && !altKey);
    var zooming = (rightclick && altKey);
    
    if( !rightclick )
    {
        leftDown = false;
    }
    else
    {
        rightDown = false;
    }

    if( sculpting )
    {
        currSculpting = false;
    }
}

function handleMouseMove(event) {
    if (!( leftDown || rightDown )) {
        return;
    }

    var altKey = event.altKey == 1;

    var sculpting = (leftDown && !altKey);
    var rotating = (leftDown && altKey) || ( rightDown && !altKey);
    var zooming = (rightDown && altKey);

    handlePointerMove(event, event.clientX, event.clientY, 
    sculpting, 
    rotating, 
    zooming ? null : 0
    );
}


function handleMouseWheel(event) 
{
    _voxSculpt.handleZoom( event.wheelDelta / 120 );
}

function handleRightClick(event) {
    event.preventDefault();
    return false;
}

var touches = []

function handleTouchStart(event) {
    touches = event.touches;

    

    var rightclick = false;

    if( touches.length == 1 )
    {
        lastMouseX = touches[0].clientX;
        lastMouseY = touches[0].clientY;
    }
    else if( touches.length == 2 )
    {
        rightclick = true;
        lastMouseX = (touches[1].clientX + touches[0].clientX) / 2.0;
        lastMouseY = (touches[1].clientY + touhces[0].clientY) / 2.0;

        lastTouchZoomX = touches[0].clientX; //touches[1].clientX - touches[0].clientX;
        lastTouchZoomY = touches[0].clientY; //touches[1].clientY - touches[0].clientY;
    }


    handlePointerStart(event, 
    touches.length == 1,
    touches.length == 2,
    touches.length == 2);
}


var lastTouchZoomX, lastTouchZoomY;

function handleTouchMove(event) {
    touches = event.touches;

    var newX, newY;

    if( touches.length  == 1 )
    {
        leftDown = true;
        rightDown = false;
        newX = touches[0].clientX / 1.0;
        newY = touches[0].clientY / 1.0;
        console.log("newXY " + newX + ", " + newY );
    }
    else if ( touches.length == 2 )
    {
        leftDown = false;
        rightDown = true;
        newX = touches[0].clientX; //(touches[1].clientX + touches[0].clientX) / 2.0;
        newY = touches[0].clientY; //(touches[1].clientY + touhces[0].clientY) / 2.0;
    }
    else
    {
        leftDown = false;
        rightDown = false;
        newX = lastMouseX;
        newY = lastMouseY;

        return;
    }

    var zoomDelta = 0;

    if( touches.length == 2 )
    {
        var distX = touches[1].clientX - touches[0].clientX;
        var distY = touches[1].clientY - touches[0].clientY;

        var deltaX = distX - lastTouchZoomX;
        var deltaY = distY - lastTouchZoomY;

        zoomDelta = deltaX + deltaY;

        lastTouchZoomX = distX;
        lastTouchZoomY = distY;
    }

    handlePointerMove(event, newX, newY, 
        touches.length == 1,
        touches.length == 2,
        zoomDelta
    );

    return false;
}