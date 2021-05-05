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

float angleBwUnitVec(vec4 unitVec1, vec4 unitVec2){
     float angle = acos(dotProd(unitVec1, unitVec2));
     return angle;
}

float gaussianDist(float theta, float alpha){
     float g_theta = 2 / ( 1 + sqrt(1 + (pow(alpha, 2) * pow(tan(theta), 2))));
     return g_theta;
}

float shadowMasking(float theta_i, float theta_o, float alpha){
     float g_i = gaussianDist(theta_i, alpha);
     float g_o = gaussianDist(theta_o, alpha);
     float g = g_i * g_o;
     return g;
}

float microFacetNormDist(float theta, float alpha){
     if(theta < 0){
          return 0;
     }
     if(theta > radians(90)){
          return 0;
     }
     float alpha_sq = pow(alpha, 2);
     float d_theta = alpha_sq / (radians(90) * pow(cos(theta), 4) * pow(alpha_sq + pow(tan(theta), 2), 2));
     return d_theta;
}

void main( void ){
     vec4 o = normalize(lightDir);
     vec4 n = normalize(vertNormalDir);
     vec4 i = normalize(eyeDir);
     vec4 h = normalize(i + o);

     float theta_d = angleBwUnitVec(n, h);

     vec4 ambient = 0.1 * vertColor * lightIntensity;
          
     vec4 diffuse = 0.5 * vertColor * dotProd(n, o) * lightIntensity;
     
     float modelComp = 0.0; 
     float expo = 0.0;
     if(blinnPhong){
          expo = max(shininess, 1.0);
          modelComp = pow(dotProd(n, h), expo);
     
     } else {
          
          float theta_i = angleBwUnitVec(n, i);
          float theta_o = angleBwUnitVec(n, o);
          float theta_h = angleBwUnitVec(n, h);

          vec4 r = normalize(reflect(-o, n));
          float alpha = angleBwUnitVec(i, r);

          float g_io = shadowMasking(theta_i, theta_o, alpha);
          float d_theta_h = microFacetNormDist(theta_h, alpha);
          
          float cookTorr = (d_theta_h * g_io) / (4 * cos(theta_i) * cos(theta_o));

          expo = max(round(shininess/25.0), 1.0);
          modelComp = pow(cookTorr, expo);

     }

     float f_theta_d = fresnelCoeff(eta, theta_d);
     vec4 specular = f_theta_d * vertColor * modelComp * lightIntensity;

     fragColor = ambient + diffuse + specular;
}