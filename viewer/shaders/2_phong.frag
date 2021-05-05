#version 410

uniform float lightIntensity;
uniform bool blinnPhong;
uniform float shininess;
uniform float eta;

in vec4 eyeDir;
in vec4 lightDir;
in vec4 vertNormalDir;
in vec4 vertColor;

out vec4 fragColor;

float dotProd(vec4 v1, vec4 v2){
     float dotProd = max(0, dot(v1, v2));
     return dotProd;
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



void main( void ){
     vec4 ambient = 0.1 * vertColor * lightIntensity;
     
     vec4 o = normalize(lightDir);
     vec4 n = normalize(vertNormalDir);
     vec4 diffuse = 0.5 * vertColor * dotProd(n, o) * lightIntensity;

     vec4 i = normalize(eyeDir);
     vec4 h = normalize(i + o);
     float theta_d = acos(dotProd(n, h));
     float f_theta_d = fresnelCoeff(eta, theta_d);
     vec4 specular = f_theta_d * vertColor * pow(dotProd(n, h), shininess) * lightIntensity;
     
     fragColor = ambient + diffuse + specular;
}