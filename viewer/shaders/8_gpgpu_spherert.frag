#version 410
#define M_PI 3.14159265358979323846

uniform mat4 mat_inverse;
uniform mat4 persp_inverse;
uniform sampler2D envMap;
uniform vec3 center;
uniform float radius;

uniform bool transparent;
uniform float shininess;
uniform float eta;

in vec4 position;
in vec4 vertColor;
in vec4 vertNormal;
in vec2 textCoords;

out vec4 fragColor;


vec4 getColorFromEnvironment(in vec3 direction){
    vec3 pos = direction;
    vec2 uv = vec2(0.0);
    uv.x = atan(pos.z, pos.x) * 0.5;
    uv.y = asin(pos.y);
    uv = uv / M_PI + 0.5;
    vec4 envCol = texture(envMap, uv);
    return envCol;
}



bool raySphereIntersect(in vec3 start, in vec3 direction, out vec3 newPoint){
    vec3 cDir = center - start;// start - center; // TODO: after envMap, check if it should reverse
    float a = dot(direction, direction);
    float b = 2.0 * dot(cDir, direction);
    float c = dot(cDir, cDir) - (radius * radius);
    float D = (b * b) - (4 * a * c);
    bool res = false;
    if(D < 0){
        newPoint = vec3(-1.0);
    } else {
        newPoint = center;// TODO (- b + sqrt(D)) / (2.0 * a);
        res = true;
    }
    return res;
}

void main(void){
    // Step 1: I need pixel coordinates. Division by w?
    vec4 worldPos = position;
    worldPos.z = 1; // near clipping plane
    worldPos = persp_inverse * worldPos;
    worldPos /= worldPos.w;
    worldPos.w = 0;
    worldPos = normalize(worldPos);
    // Step 2: ray direction:
    vec3 u = normalize((mat_inverse * worldPos).xyz); // ray direction
    vec3 P = (mat_inverse * vec4(0, 0, 0, 1)).xyz; // ray starting point
    vec3 t = vec3(0.0);
    
    vec4 resultColor = vec4(0,0,0,1);
    if(raySphereIntersect(P, u, t)){
        resultColor = vec4(1.0);        
    } else {
        resultColor = getColorFromEnvironment(u);// texture(envMap, textCoords);
    }
    fragColor = resultColor;
}
