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
    // float t = 0.5 * (direction.y + 1.0f);
    // return ( (1.0f - t) * vec4(1.0f) ) + (t * vec4(0.5f, 0.7f, 1.0f, 1.0f));
}

struct Ray{
    vec3 origin;
    vec3 direction;
};

vec3 point_at_parameter(Ray r, float t){
    vec3 pt = r.origin + (t * r.direction);
    return pt;
}

struct hit_record{
    float t; // parameter
    vec3 p; // hit point
    vec3 normal; // surface normal at hit point
};

struct sphere{
    vec3 center;
    float radius;
};

bool check_hit_rec(vec3 sphere_center, float sphere_radius, Ray r, float temp, float t_min, float t_max, out hit_record rec){
    if(temp < t_max && temp > t_min){
        rec.t = temp;
        rec.p = point_at_parameter(r, rec.t);
        rec.normal = (rec.p - sphere_center) / sphere_radius;
        return true;
    }
    return false;
}

bool hit_sphere(vec3 sphere_center, float sphere_radius, Ray r, float t_min, float t_max, out hit_record rec){
    vec3 oc = r.origin - sphere_center;
    float a = dot(r.direction, r.direction);
    float b = dot(r.direction, oc); // redundant 2s are removed
    float c = dot(oc, oc) - (sphere_radius * sphere_radius);
    float discriminant = (b * b) - (a * c);
    if(discriminant > 0){
        float temp = (-b - sqrt(discriminant)) / a;
        hit_record hr;
        if(check_hit_rec(sphere_center, sphere_radius, r, temp, t_min, t_max, hr)){
            rec = hr;
            return true;
        }
        temp = (-b + sqrt(discriminant)) / a;
        if(check_hit_rec(sphere_center, sphere_radius, r, temp, t_min, t_max, hr)){
            rec = hr;
            return true;
        }
    }
    return false;
}

#define NB_SPHERE_MAX 5
struct sphere_list{
    sphere s[NB_SPHERE_MAX];
    int list_size;
};

bool hit_sphere_list(sphere_list s_list, Ray r, float t_min, float t_max, out hit_record rec){
    hit_record temp_rec;
    bool hit_anything = false;
    float closest_so_far = t_max;
    for (int i = 0; i < s_list.list_size; ++i) {
        if(hit_sphere(s_list.s[i].center, s_list.s[i].radius, r, t_min, closest_so_far, temp_rec)){
            hit_anything = true;
            closest_so_far = temp_rec.t;
            rec = temp_rec;
        }
    }
    return hit_anything;
}

struct stackFrame{
    Ray r;
    float I;
    int lev;
};

#define MAX_BOUNCE 4
#define STACK_SIZ (MAX_BOUNCE * 2)
int sp = 0;
stackFrame Stack[STACK_SIZ];

void push(stackFrame dat){
    if(dat.lev < MAX_BOUNCE){
        if(sp < STACK_SIZ){
            Stack[sp] = dat;
            ++sp;
        }
    }
}

stackFrame pop(){
    stackFrame dat;
    if(sp >= 0){
        --sp;
        dat = Stack[sp];
    }
    return dat;
}

bool isStackEmpty(){
    bool res = false;
    if(sp < 0){
        res = true;
    }
    return res;
}

vec3 random_in_unit_sphere() {
    vec3 p = vec3(0.5, 0.5, 0.5);
    return p;
}


#define MAX_FLOAT	999999999
vec4 color_nonrecursive(Ray r, sphere_list s){
    stackFrame d = stackFrame(r, 1.0f, 0);
    push(d);
    while(!isStackEmpty()){
        d = pop();
        hit_record rec;
        if (hit_sphere_list(s, d.r, 0.001, MAX_FLOAT, rec)){
            vec3 target = rec.p + rec.normal + random_in_unit_sphere();
            d.r = Ray(rec.p, target - rec.p);
            d.lev++;
            d.I *= 0.5f;
            if(d.lev < MAX_BOUNCE){
                push(d);
            } else {
                vec3 unit_direction = normalize(r.direction);
                return d.I * getColorFromEnvironment(unit_direction);
            }
        } else {
            vec3 unit_direction = normalize(r.direction);
            return d.I * getColorFromEnvironment(unit_direction);
        }
    }
    return vec4(1.0, 0.0, 0.0f, 1.0f);
}

void main(void){
    vec4 worldPos = position;
    worldPos.z = 1; // near clipping plane
    worldPos = persp_inverse * worldPos;
    worldPos /= worldPos.w;
    worldPos.w = 0;
    // worldPos = normalize(worldPos);

    // vec3 u = normalize((mat_inverse * worldPos).xyz); // ray direction
    vec3 P = (mat_inverse * vec4(0, 0, 0, 1)).xyz; // ray starting point
    vec3 u = (mat_inverse * worldPos).xyz; // ray direction not normalized
    Ray r = Ray(P, u);

    sphere_list s_list;
    s_list.list_size = 1;
    s_list.s[0] = sphere(center, radius);

    fragColor = color_nonrecursive(r, s_list);
}
