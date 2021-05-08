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
    vec3 cDir = start - center;
    float a = dot(direction, direction);
    float b = 2.0 * dot(cDir, direction);
    float c = dot(cDir, cDir) - (radius * radius);
    float D = (b * b) - (4 * a * c);
    bool res = false;
    float t0 = 0.0;
    if(D >= 0){
        if(D == 0){
            t0 = -b / (2 * a);
            res = true;
        } else {
            t0 = (-b + sqrt(D)) / (2 * a);
            if(t0 > 0){
                res = true;
            }
        }
    }
    if(res == true){
        newPoint = start + (t0 * direction);
        // float theta = acos(Nhit.y, radius);
        // float phi = atan(Nhit.z, x);
    } else {
        newPoint = vec3(-1.0);
    }
    return res;
}

float fresnelCoeff(float etaReal, float angle){
     float c_i = sqrt(pow(etaReal, 2) - pow(sin(angle), 2));
     
     float cos_angle = cos(angle);
     
     float f_s = pow(abs((cos_angle - c_i)/(cos_angle + c_i)), 2);
     
     float temp = pow(etaReal, 2) * cos_angle;
     float f_p = pow(abs((temp - c_i)/(temp + c_i)), 2);
     
     float f = (f_s + f_p)/2;
     return f;
}

float angleBwUnitVec(vec3 unitVec1, vec3 unitVec2){
     float angle = acos(max(dot(unitVec1, unitVec2), 0));
     return angle;
}

bool isRayInSphere(vec3 Phit,vec3 dir){
    vec3 ray = Phit + dir;
    vec3 t = ray - center;
    float l = length(t);
    bool res = false;
    if(l < radius){
        res = true;
    }
    return res;
}

struct stack{
    vec3 P;
    vec3 u;
    float I;
    int lev;
};

#define MAX_BOUNCE 4
#define STACK_SIZ (MAX_BOUNCE * 2) 
int sp = 0;
stack Stack[STACK_SIZ];

void push(vec3 P, vec3 u, float I, int lev){
    if(lev < MAX_BOUNCE){
        if(sp < STACK_SIZ){
            stack dat = stack(P, u, I, lev);
            Stack[sp] = dat;
            ++sp;
        }
    } 
}

void pop(out vec3 P, out vec3 u, out float I, out int lev){
    if(sp >= 0){
        --sp;
        stack dat = Stack[sp];
        P = dat.P;
        u = dat.u;
        I = dat.I;
        lev = dat.lev;
    }
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
    vec3 Phit = vec3(0.0);
    
    vec4 resultColor = vec4(0,0,0,1);
    if(raySphereIntersect(P, u, Phit)){
        vec3 i = normalize(Phit - P);// normalize(P - Phit);
        vec3 n = normalize(center - Phit);// normalize(Phit - center);
        vec3 r = normalize(reflect(i, n));
        vec3 t = normalize(refract(i, n, eta));
        float theta_r = angleBwUnitVec(i, n);
        float theta_t = angleBwUnitVec(t, -n);
        float eta_r = 1.0;
        if(isRayInSphere(Phit, r)){
            eta_r = eta;
        }
        resultColor = getColorFromEnvironment(r) * fresnelCoeff(eta_r, theta_r);
    } else {
        resultColor = getColorFromEnvironment(u);// texture(envMap, textCoords);
    }

    fragColor = resultColor;
}

-------------------------------------------------------------------------------------------------------------------


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

bool solveQuadratic(in float a, in float b, in float c, out float x0, out float x1){
    float discr = (b * b) - (4 * a * c); 
    if (discr < 0){
        return false;
    } else if (discr == 0) { 
        x0 = x1 = - (0.5 * b) / a; 
    } else {
        float q = (b > 0) ? 
            -0.5 * (b + sqrt(discr)): 
            -0.5 * (b - sqrt(discr));
        x0 = q / a; 
        x1 = c / q;
    } 
    return true; 
}

void swap(inout float n0, inout float n1){
    float temp = n1;
    n1 = n0;
    n0 = temp;
}

bool raySphereIntersect(in vec3 start, in vec3 direction, out vec3 newPoint){
    vec3 cDir = start - center; // for analytical method it's start - center, for geometric method it's center - start 
    float a = dot(direction, direction);
    float b = 2.0 * dot(cDir, direction);
    float c = dot(cDir, cDir) - (radius * radius);
    float D = (b * b) - (4 * a * c);
    bool res = false;
    float t0 = 0.0;
    float t1 = 0.0;
    if (solveQuadratic(a, b, c, t0, t1)){
        if (t0 > t1){
            swap(t0, t1);
        }
        if (t0 < 0) {
            t0 = t1;
            if (t0 > 0){
                res = true;
            }
        } else {
            res = true;
        }
    }
    if(res == true){
        newPoint = start + (t0 * direction);
    } else {
        newPoint = vec3(0.0);
    }
    return res;
}

float fresnelCoeff(float etaReal, float angle){
    float c_i = sqrt(pow(etaReal, 2) - pow(sin(angle), 2));
    
    float cos_angle = cos(angle);
    
    float f_s = pow(abs((cos_angle - c_i)/(cos_angle + c_i)), 2);
    
    float temp = pow(etaReal, 2) * cos_angle;
    float f_p = pow(abs((temp - c_i)/(temp + c_i)), 2);
    
    float f = (f_s + f_p)/2;
    return f;
}

float getFresnelCoeff(float eta_r, float eta_t, float theta_r, float theta_t){
    float t1 = eta_t * cos(theta_r);
    float t2 = eta_r * cos(theta_t);
    float f_par = (t1 - t2)/(t1 + t2);

    t1 = eta_r * cos(theta_r);
    t2 = eta_t * cos(theta_t);
    float f_per = (t1 - t2)/(t1 + t2);
    
    float f = (pow(f_par, 2) + pow(f_per, 2))/2;
    return f;
}

float angleBwUnitVec(vec3 unitVec1, vec3 unitVec2){
    float angle = acos(max(dot(unitVec1, unitVec2), 0));
    return angle;
}

bool isRayInSphere(vec3 Phit, vec3 dir){
    vec3 ray = Phit + dir;
    vec3 t = ray - center;
    float l = length(t);
    bool res = false;
    if(l < radius){
        res = true;
    }
    return res;
}

bool isPtInSphere(vec3 Pt){
    vec3 t = Pt - center;
    bool res = false;
    if(length(t) <= radius){
        res = true;
    }
    return res;
}

struct stack{
    vec3 P;
    vec3 u;
    float I;
    int lev;
};

#define MAX_BOUNCE 4
#define STACK_SIZ (MAX_BOUNCE * 2) 
int sp = -1;
stack Stack[STACK_SIZ];

void push(vec3 P, vec3 u, float I, int lev){
    if(lev < MAX_BOUNCE){
        if(sp < STACK_SIZ){
            ++sp;
            Stack[sp] = stack(P, u, I, lev);
        }
    } 
}

void pop(out vec3 P, out vec3 u, out float I, out int lev){
    if(sp >= 0){
        stack dat = Stack[sp];
        P = dat.P;
        u = dat.u;
        I = dat.I;
        lev = dat.lev;
        --sp;
    }
}

bool isStackEmpty(){
    bool res = false;
    if(sp < 0){
        res = true;
    }
    return res;
}

vec4 TraceRay(vec3 start, vec3 dir){
    sp = -1;
    vec4 col = vec4(vec3(0.0), 1.0);
    push(start, dir, 1.0, 0);
    while(isStackEmpty() == false){
        vec3 P = vec3(0.0);
        vec3 u = vec3(0.0);
        int lev = 0;
        float I = 0.0;
        pop(P, u, I, lev);
    
        vec3 Phit = vec3(0.0);
        if(raySphereIntersect(P, u, Phit)){
            vec3 n = normalize(Phit - center);  
            // reflected ray
            vec3 i = normalize(P - Phit); 
            vec3 r = normalize(reflect(i, n));
            float theta_r = angleBwUnitVec(r, n);
            float eta_r = 1.003;
            float eta_t = eta;
            // if(isPtInSphere(Phit + (0.1 * radius * -r))){
            //     // reflected ray inside sphere and transmitted ray outside
            //     eta_r = eta;
            //     eta_t = 1.003;
            // }

            vec3 t = normalize(refract(i, n, eta_t));
            float theta_t = angleBwUnitVec(t, -n);
            float fres = getFresnelCoeff(eta_r, eta_t, theta_r, theta_t);
            
            push(Phit + (0.1 * radius * r), r, I * fres, lev + 1);
            // if(transparent){
            //     push(Phit + (0.1 * radius * t), t, I * (1 - fres), lev + 1);
            // }
        } else {
            col += getColorFromEnvironment(u) * I;
        }
    }
    return col;
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
    
    fragColor = TraceRay(P, u);
}
