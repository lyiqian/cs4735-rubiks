/* Project code for CS4735 Compute Graphics at UNB
 * Author: Yiqian Liu (#3481577)
 * Model: Rubik's Cube
 * based on 'RotateObject.js (c) 2012 matsuda and kanda'
 * For more information, please refer to my report for this project
 */

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform vec4 u_LightLocation;\n' +
  'uniform mat4 u_VpMatrix;\n' +
  'uniform mat4 u_InvVpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NMdlMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_LightLocation;\n' +  
  'void main() {\n' +
  '  gl_Position = u_VpMatrix * u_ModelMatrix * a_Position;\n' +
  '  v_Position = vec3         (u_ModelMatrix * a_Position);\n' +
  '  v_Color = a_Color;\n' +
  '  v_Normal = normalize(vec3(u_NMdlMatrix * a_Normal));\n' +
  '  v_LightLocation = vec3(u_InvVpMatrix * u_LightLocation);\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec3 v_Normal;\n' +
  'uniform vec3 u_Ambient;\n' +
  'uniform vec3 u_Diffuse;\n' +
  'varying vec3 v_LightLocation;\n' +
  'void main() {\n' +
  '  float nDotL = max(0.0, dot(normalize(v_Normal), normalize(v_LightLocation - v_Position)));\n' +
  '  gl_FragColor =vec4(v_Color.rgb * u_Ambient + v_Color.rgb * u_Diffuse * nDotL, v_Color.a);\n' +
  '}\n';

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex information
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  
  // initialize the positions and rotation records of the cubes 
  initCubeInfo();

  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

	// Get the storage locations of uniform variables Mvp
	var u_VpMatrix = gl.getUniformLocation(gl.program, 'u_VpMatrix');
	if (!u_VpMatrix) { 
		console.log('Failed to get the storage location of u_VpMatrix');
		return;
	}
	
	// Get the storage locations of uniform variables Model
	var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!u_ModelMatrix) { 
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}
	
	// Get the storage location of u_NMdlMatrix
	var u_NMdlMatrix = gl.getUniformLocation(gl.program, 'u_NMdlMatrix');
	if (!u_NMdlMatrix) {
		console.log('Failed to get the storage location of u_NMdlMatrix');
		return;
	}
	
	// Get the storage location of u_InvVpMatrix
	var u_InvVpMatrix = gl.getUniformLocation(gl.program, 'u_InvVpMatrix');
	if (!u_InvVpMatrix) {
		console.log('Failed to get the storage location of u_InvVpMatrix');
		return;
	}
  
	setupLight(gl);

	// Calculate the view projection matrix
	var viewProjMatrix = new Matrix4();
	viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
	viewProjMatrix.lookAt(10.0, 10.0, 20.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

	
	// Register the event handler
	var currentAngle = [0.0, 0.0]; // Current rotation angle ([x-axis, y-axis] degrees)
	initEventHandlers(canvas, currentAngle);
  
  	/* keyboard events */
/* 	var onKeyDown = function(e)
	{
		keyDown(e, gl, n, viewProjMatrix, u_VpMatrix, u_ModelMatrix, u_NMdlMatrix, u_InvVpMatrix, currentAngle);
	};
	document.addEventListener("keypress", onKeyDown);	 */
	
	document.onkeydown = function(e)
	{
		keyDown(e);
	}

  var tick = function() {   // Start drawing, LIKE A WHILE-LOOP
    draw(gl, n, viewProjMatrix, u_VpMatrix, u_ModelMatrix, u_NMdlMatrix, u_InvVpMatrix, currentAngle);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}


function initVertexBuffers(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices = new Float32Array([   // Vertex coordinates
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,    // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,    // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,    // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,    // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0     // v4-v7-v6-v5 back
  ]);

/* 	var texCoords = new Float32Array 	// Texture coordinates
	([  
		0.333, 1.0,   0.0, 1.0,   0.0, 0.666,   0.333, 0.666,    // v0-v1-v2-v3 front
		0.0, 0.333,   0.0, 0.0,   0.333, 0.0,   0.333, 0.333,    // v0-v3-v4-v5 right
		0.666, 0.0,   0.666, 0.333,   0.333, 0.333,   0.333, 0.0,    // v0-v5-v6-v1 up
		0.666, 0.666,   0.333, 0.666,   0.333, 0.333,   0.666, 0.333,    // v1-v6-v7-v2 left
		0.0, 0.333,   0.333, 0.333,   0.333, 0.666,   0.0, 0.666,    // v7-v4-v3-v2 down
		0.333, 0.666,   0.666, 0.666,   0.666, 1.0,   0.333, 1.0     // v4-v7-v6-v5 back
	]); */
  
  var colors = new Float32Array([     // Colors
    0.8, 0.1, 0.1,  0.8, 0.1, 0.1,  0.8, 0.1, 0.1,  0.8, 0.1, 0.1,  // v0-v1-v2-v3 front(R)
    0.1, 0.1, 0.8,  0.1, 0.1, 0.8,  0.1, 0.1, 0.8,  0.1, 0.1, 0.8,  // v0-v3-v4-v5 right(B)
    1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v0-v5-v6-v1 up(W)
    0.1, 0.8, 0.1,  0.1, 0.8, 0.1,  0.1, 0.8, 0.1,  0.1, 0.8, 0.1,  // v1-v6-v7-v2 left(G)
    0.9, 0.9, 0.1,  0.9, 0.9, 0.1,  0.9, 0.9, 0.1,  0.9, 0.9, 0.1,  // v7-v4-v3-v2 down(Y)
    1.0, 0.4, 0.1,  1.0, 0.4, 0.1,  1.0, 0.4, 0.1,  1.0, 0.4, 0.1   // v4-v7-v6-v5 back(O)
  ]);
  
  var indices = new Uint8Array([       	// Indices of the vertices
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
  ]);
  
    var normals = new Float32Array		// Normal coordinates
	([   
		0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
		1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
		0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
	   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
		0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
		0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
	]);


  // Create a buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    return -1;
  }

  // Write vertex information to buffer object
  if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position')) return -1; // Vertex coordinates
  //if (!initArrayBuffer(gl, texCoords, 2, gl.FLOAT, 'a_TexCoord')) return -1;// Texture coordinates
  if (!initArrayBuffer(gl, colors, 3, gl.FLOAT, 'a_Color')) return -1;
  if (!initArrayBuffer(gl, normals, 3, gl.FLOAT, 'a_Normal')) return -1; // Normal coordinates

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}


/* The indices of these cube is shown as below: 
 *         (back side, orange)
 *      	17 18 19
 *      	20 21 22
 *      	23 24 25
 *    	9 10 11
 *     12    13    (middle layer)
 *     14 15 16
 * 	 0 1 2 
 * 	 3 4 5
 * 	 6 7 8
 * (front side, red)
 */
var cubePos = new Array(26);
var cubeRotRecords = new Array(26);
function initCubeInfo()
{
	cubePos[0]=[-1,1,1];
	cubePos[1]=[0,1,1];
	cubePos[2]=[1,1,1];
	cubePos[3]=[-1,0,1];
	cubePos[4]=[0,0,1];
	cubePos[5]=[1,0,1];
	cubePos[6]=[-1,-1,1];
	cubePos[7]=[0,-1,1];
	cubePos[8]=[1,-1,1];
	
	cubePos[9]=[-1,1,0];
	cubePos[10]=[0,1,0];
	cubePos[11]=[1,1,0];
	cubePos[12]=[-1,0,0];
	cubePos[13]=[1,0,0];
	cubePos[14]=[-1,-1,0];
	cubePos[15]=[0,-1,0];
	cubePos[16]=[1,-1,0];
	
	cubePos[17]=[-1,1,-1];
	cubePos[18]=[0,1,-1];
	cubePos[19]=[1,1,-1];
	cubePos[20]=[-1,0,-1];
	cubePos[21]=[0,0,-1];
	cubePos[22]=[1,0,-1];
	cubePos[23]=[-1,-1,-1];
	cubePos[24]=[0,-1,-1];
	cubePos[25]=[1,-1,-1];
	
	for (var i = 0; i < 26; i++)
	{
		cubeRotRecords[i] = [];
	}
	
	
}

function setupLight(gl){
	  
	// Get the storage location of u_Ambient
	var u_Ambient = gl.getUniformLocation(gl.program, 'u_Ambient');
	if (!u_Ambient) {
		console.log('Failed to get the storage location of u_Ambient');
		return;
	}
	
	// Get the storage location of u_Diffuse
	var u_Diffuse = gl.getUniformLocation(gl.program, 'u_Diffuse');
	if (!u_Diffuse) {
		console.log('Failed to get the storage location of u_Diffuse');
		return;
	}
	
	// Get the storage location of u_LightLocation
	var u_LightLocation = gl.getUniformLocation(gl.program, 'u_LightLocation');
	if (!u_LightLocation) {
		console.log('Failed to get the storage location of u_LightLocation');
		return;
	}
	
	gl.uniform3f(u_Ambient, 0.7, 0.7, 0.65);

	gl.uniform3f(u_Diffuse, 0.3, 0.3, 0.3);
	
	gl.uniform4f(u_LightLocation, 0.0, 3.0, 5.0, 1.0);
}

function initEventHandlers(canvas, currentAngle) {
	var dragging = false;         // Dragging or not
	var lastX = -1, lastY = -1;   // Last position of the mouse

	canvas.onmousedown = function(ev) // Mouse is pressed
	{   
		var x = ev.clientX, y = ev.clientY;
		// Start dragging if a moue is in <canvas>
		var rect = ev.target.getBoundingClientRect();
		if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) 
		{
			lastX = x; lastY = y;
			dragging = true;
		}
	};
	canvas.onmouseup = function(ev) // Mouse is released
	{ 
		dragging = false; 
	}; 
	canvas.onmousemove = function(ev) // Mouse is moved
	{ 
		var x = ev.clientX, y = ev.clientY;
		if (dragging) 
		{
			var factor = 100/canvas.height; // The rotation ratio
			var dx = factor * (x - lastX);
			var dy = factor * (y - lastY);
			// Limit x-axis rotation angle to -90 to 90 degrees
			currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
			currentAngle[1] = currentAngle[1] + dx;
		}
		lastX = x, lastY = y;
	};
}

/* just an idea: using some primes to represent different sides 
var FRONT = 2;
var BACK = 3;
var LEFT = 5;
var RIGHT = 7;
var TOP = 11;
var BOTTOM = 13;*/
/* just an idea: using the product of side numbers to indicate the position of a cube
var cubePos = new Int8Array
([ // initialization
	110, 22, 154, 10, 2, 14, 130, 26, 182,
	55, 11, 77, 5, 7, 65, 13, 91,
	165, 33, 231, 15, 3, 21, 195, 39, 273
]); */

/* using [x, y, z] to represent which side to rotate */
var FRONT = [0, 0, 1];
var BACK =  [0, 0,-1];
var LEFT = [-1, 0, 0];
var RIGHT = [1, 0, 0];
var UP =    [0, 1, 0];
var DOWN =  [0,-1, 0];
var SHUFFLE = 30;
function keyDown(e)
{
	if (!e.shiftKey)
	{
		switch (e.keyCode)
		{
		case 81: //q
			rotate(FRONT, 1);
			break;
		case 69: //e
			rotate(BACK, 1);
			break;
		case 65: //a
			rotate(LEFT, 1);
			break;
		case 68: //d
			rotate(RIGHT, 1);
			break;
		case 87: //w
			rotate(UP, 1);
			break;
		case 83: //s
			rotate(DOWN, 1);
			break;		
		case 48: //'0', for shuffle
			for (var i = 0; i < SHUFFLE; i++) // # of steps of shuffle
			{		
				var xyz = Math.floor(Math.random() * 3); // random dimension
				var side = [0, 0, 0];
				side[xyz] = Math.pow(-1, Math.floor(Math.random() * 2)); // 1 or -1	
				var rotDirection = Math.pow(-1, Math.floor(Math.random() * 2)); // 1 or -1
				rotate(side, rotDirection);
			}
			break;
		default: return;
		}
	}
	else
	{
		switch (e.keyCode)
		{
		case 81: //q
			rotate(FRONT, -1);
			break;
		case 69: //e
			rotate(BACK, -1);
			break;
		case 65: //a
			rotate(LEFT, -1);
			break;
		case 68: //d
			rotate(RIGHT, -1);
			break;
		case 87: //w
			rotate(UP, -1);
			break;
		case 83: //s
			rotate(DOWN, -1);
			break;		
		default: return;
		}
	}
}

var tempAngle = new Array(26); // rotation animation angle
function rotate(side, rotDirection)
{
	var sideAxis;
	var sideDirection;
	for (var i = 0; i < 3; i++) // to decode which side to rotate
	{
		if (side[i] != 0)
		{
			sideAxis = i;
			sideDirection = side[i];
			break;
		}
	}
	for (var i = 0; i < 26; i++) // to find out which cubes are currently at that side
	{
		var tempPos = cubePos[i];
		if (tempPos[sideAxis] == sideDirection)
		{	
			switch (sideAxis)
			{
			/* it is necessary to save all rotations, only current angle is not enough */
			case 0:
				cubeRotRecords[i].push([-90 * rotDirection, sideDirection, 0, 0]);
				break;
			case 1:
				cubeRotRecords[i].push([-90 * rotDirection, 0, sideDirection, 0]);
				break;
			case 2:
				cubeRotRecords[i].push([-90 * rotDirection, 0, 0, sideDirection]);
				break;	
			}
			
			tempAngle[i] = 0.0; // reset the indicator for animated rotation
			
			/* to calculate new position of the cube */
			/* swap another two axes' value, but with side- and rot-Direction(-1 or 1) as coefficients */
			var temp = tempPos[(sideAxis + 1) % 3];
			tempPos[(sideAxis + 1) % 3] = rotDirection * sideDirection * tempPos[(sideAxis + 2) % 3];
			tempPos[(sideAxis + 2) % 3] = -rotDirection * sideDirection * temp;
			
			cubePos[i] = tempPos;
		}
	}
}

var TRANSLATE_UNIT = 2.08;  // for the translation distance
var g_VpMatrix = new Matrix4(); // View projection matrix
var g_ModelMatrix = new Matrix4();
function draw(gl, n, viewProjMatrix, u_VpMatrix, u_ModelMatrix, u_NMdlMatrix, u_InvVpMatrix, currentAngle) 
{
	var index = 0; // the index of the cube to be drawn, starting from Cube 0
	var step = animate();
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	// Calculate The model view projection matrix and pass it to u_VpMatrix
	g_VpMatrix.set(viewProjMatrix);
	g_VpMatrix.rotate(currentAngle[0], 1.0, 0.0, 0.0); // Rotation around x-axis
	g_VpMatrix.rotate(currentAngle[1], 0.0, 1.0, 0.0); // Rotation around y-axis
	gl.uniformMatrix4fv(u_VpMatrix, false, g_VpMatrix.elements);
	/* to make the lightLocation fixed at initial (0, 3, 5) in world coordinates */
	var g_InVpMatrix = new Matrix4();
	g_InVpMatrix.setRotate(currentAngle[0], 1.0, 0.0, 0.0);
	g_InVpMatrix.rotate(currentAngle[1], 0.0, 1.0, 0.0);
	g_InVpMatrix.setInverseOf(g_InVpMatrix);
	gl.uniformMatrix4fv(u_InvVpMatrix, false, g_InVpMatrix.elements);
	
	// Center cube
	g_ModelMatrix.setIdentity();
	drawGeneralCube(gl, n, u_ModelMatrix, u_NMdlMatrix);
	
	// draw other cubes
	for (var z = 1; z >= -1; z--)
	{
		for (var y = 1; y >= -1; y--)
		{
			for (var x = -1; x <= 1; x++)
			{
				if (x == 0 && y == 0 && z == 0) // ignore the center cube, all other cubes' parent
				{
					continue;
				}
				else
				{
					pushMatrix(g_ModelMatrix); 
					drawTheCube(x, y, z, index, step, gl, n, u_ModelMatrix, u_NMdlMatrix);
					index++; 
					g_ModelMatrix = popMatrix();
				}
			}
		}
	}
}

function drawTheCube(transX, transY, transZ, index, step, gl, n, u_ModelMatrix, u_NMdlMatrix)
{
	var len = cubeRotRecords[index].length;
	if (len != 0) // if there is a rotation happened
	{
		var cubeRot = cubeRotRecords[index][len - 1];
		if (Math.abs(tempAngle[index] + cubeRot[0] * step) < 90) // rotation has not finished, do animation
		{
			animatedRotation(cubeRot, transX, transY, transZ, index, len, step, 
								gl, n, u_ModelMatrix, u_NMdlMatrix);
		}
		else //rotation finished, draw still cubes
		{
			for (var i = len - 1; i >= 0; i--) // perform most recent rotation first
			{
				cubeRot = cubeRotRecords[index][i];
				g_ModelMatrix.rotate(cubeRot[0], cubeRot[1], cubeRot[2], cubeRot[3]);
			}
			g_ModelMatrix.translate(transX * TRANSLATE_UNIT, transY * TRANSLATE_UNIT, transZ * TRANSLATE_UNIT);
			drawGeneralCube(gl, n, u_ModelMatrix, u_NMdlMatrix); 
		}
	}
	else // no rotation, just translation
	{
		g_ModelMatrix.translate(transX * TRANSLATE_UNIT, transY * TRANSLATE_UNIT, transZ * TRANSLATE_UNIT);
		drawGeneralCube(gl, n, u_ModelMatrix, u_NMdlMatrix);
	}
}

function animatedRotation(cubeRot, transX, transY, transZ, index, len, step, 
							gl, n, u_ModelMatrix, u_NMdlMatrix)
{
		tempAngle[index] += cubeRot[0] * step;
		g_ModelMatrix.rotate(tempAngle[index], cubeRot[1], cubeRot[2], cubeRot[3]); // replace the last record with tempAngle
		for (var i = len - 2; i >= 0; i--) // compute previous rotations
		{
			cubeRot = cubeRotRecords[index][i];
			g_ModelMatrix.rotate(cubeRot[0], cubeRot[1], cubeRot[2], cubeRot[3]);
		}
		g_ModelMatrix.translate(transX * TRANSLATE_UNIT, transY * TRANSLATE_UNIT, transZ * TRANSLATE_UNIT);
		drawGeneralCube(gl, n, u_ModelMatrix, u_NMdlMatrix);
}

function drawGeneralCube(gl, n, u_ModelMatrix, u_NMdlMatrix)
{
	gl.uniformMatrix4fv(u_ModelMatrix, false, g_ModelMatrix.elements);
	gl.uniformMatrix4fv(u_NMdlMatrix, false, getInverseTranspose(g_ModelMatrix).elements);
	// Draw the cube
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);   
}

function getInverseTranspose(mat4){
	m = new Matrix4();
	m.setInverseOf(mat4);
	m.transpose();
	return m;
}

var g_StackOfMatrix = [];
function pushMatrix(m)
{
	var m2 = new Matrix4();
	m2.set(m);
	g_StackOfMatrix.push(m2);
}

function popMatrix()
{
	return g_StackOfMatrix.pop();
}

var g_last = Date.now();
var ROT_SPEED = 4;
function animate() {
	// Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;
	return ROT_SPEED * elapsed / 1000.0;
}

function initArrayBuffer(gl, data, num, type, attribute) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment to a_attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}