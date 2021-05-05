#version 410

uniform mat4 matrix;
uniform mat4 perspective;
uniform mat3 normalMatrix;
uniform bool noColor;
uniform vec3 lightPosition;

// World coordinates
in vec4 vertex;
in vec4 normal;
in vec4 color;
in vec2 texcoords;

out vec4 eyeDir;
out vec4 lightDir;
out vec4 vertNormalDir;
out vec4 vertcolor;
out vec2 textCoords;

void main( void ){
    if (noColor){
        vertcolor = vec4(0.4, 0.2, 0.6, 1.0);
    } else {
        vertcolor = color;
    }
    
    textCoords = texcoords;

    vertNormalDir = vec4(normalMatrix * normal.xyz, 0.0);

    vec4 w_lightPosition = matrix * vec4(lightPosition, 1.0);
    vec4 w_vertex = matrix * vertex;
    lightDir = w_lightPosition - w_vertex;
    
    vec4 eyePos = -vertex;
    vec4 w_eyePos = matrix * eyePos;
    eyeDir = vec4(w_eyePos.xyz, 0.0);

    gl_Position = perspective * w_vertex;
}
