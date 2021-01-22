const hurtMuscle_vShader = [
  'varying vec2 vUv;',
  'varying vec3 vColor;',
  'varying float r;',
  'uniform float channelIndex;',
  'void main(){',
  'vUv = uv;',
  'vColor = color;',
  'if (channelIndex == 0.0){',
  'r=max(color.x-color.y,0.0);}',
  'else if(channelIndex == 1.0){',
  'r=max(color.y-color.z,0.0);}',
  'else if(channelIndex == 2.0){',
  'r=max(color.z-color.x,0.0);}',
  'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
  '}',
].join('\n');

const hurtMuscle_fShader = [
  'varying vec2 vUv;',
  'varying vec3 vColor;',
  'varying float r;',
  'uniform sampler2D diffuseTex;',
  'void main() {',
  'gl_FragColor=texture2D(diffuseTex, vUv)*vec4(1.0,1.0,0.0,1.0)*(1.0-r)+vec4(0.4,0,0.4,1.0)*r;',
  'gl_FragColor.w=0.5;',

  '}'

].join('\n')

exports.hurtMuscleEffectShader = {
  vShader: hurtMuscle_vShader,
  fShader: hurtMuscle_fShader
}