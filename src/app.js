import { 
  Engine, 
  FreeCamera, 
  Vector3, 
  Scene, 
  MeshBuilder, 
  StandardMaterial, 
  Color3,
  HemisphericLight,
  Ray } from 'babylonjs';

const objectUnselectedColor = Color3.FromHexString('#5853e6');
const objectSelectedColor = Color3.FromHexString('#f0520a');

class App {
  constructor() {
    // Setup Babylon.js
    const canvas = document.getElementById('canvas');
    const engine = new Engine(canvas, true);
    this.scene = new Scene(engine);
    const camera = new FreeCamera('camera', new Vector3(0, 3, -3), this.scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);
    
    this.createScene();
    this.initXR();

    engine.runRenderLoop(() => {
      if (this.controllers) {
        this.controllers.forEach(controller => {
          this.handleController(controller);
        });
      }

      if (this.scene) {
        this.scene.render();
      }
    });

    window.addEventListener('resize', () => {
      engine.resize();
    });
  }

  createScene() {
    // Box
    const box = MeshBuilder.CreateBox('box', { size: 0.5 }, this.scene);
    const boxMaterial = new StandardMaterial('boxMaterial', this.scene);
    boxMaterial.diffuseColor = objectUnselectedColor;
    box.material=boxMaterial;

    // Light
    const light = new HemisphericLight('light', new Vector3(-0.5, -1, -0.25), this.scene);
    light.diffuse = Color3.FromHexString('#ffffff');
    light.groundColor = Color3.FromHexString('#bbbbff');
    light.intensity = 1;
  }

  async initXR() {
    const sessionMode = 'immersive-vr';
    // xr: WebXRDefaultExperience https://doc.babylonjs.com/typedoc/classes/babylon.webxrdefaultexperience
    const xr = await this.scene.createDefaultXRExperienceAsync({ uiOptions: { sessionMode }});
    const isSupported = await xr.baseExperience.sessionManager.isSessionSupportedAsync(sessionMode);
    if (!isSupported) {
      alert('WebXR is not supported')
    } else {
      this.controllers = [];
      // xr.input: WebXRInput https://doc.babylonjs.com/typedoc/classes/babylon.webxrinput
      xr.input.onControllerAddedObservable.add(controller => {
        // controller: WebXRInputSource https://doc.babylonjs.com/typedoc/classes/babylon.webxrinputsource
        controller.userData = {trigger: { pressed: false, pressedPrev: false }};
        this.controllers.push(controller);
        controller.onMotionControllerInitObservable.add(motionController => {
          // motionController: WebXRAbstractMotionController https://doc.babylonjs.com/typedoc/classes/babylon.webxrabstractmotioncontroller
          const triggerComponent = motionController.getComponent('xr-standard-trigger');
          triggerComponent.onButtonStateChangedObservable.add(() => {
            controller.userData.trigger.pressed = triggerComponent.pressed;
          });
        });
      });
    }
  }

  handleController(controller) {
    if (controller.userData.trigger.pressed) {
      if (!controller.userData.trigger.pressedPrev) {
        // Trigger pressed
        const ray = this.getControllerRay(controller);
        const hit = this.scene.pickWithRay(ray);
        if (hit && hit.hit) {
          this.selectedMesh = hit.pickedMesh;
          this.selectedMesh.material.diffuseColor = objectSelectedColor;
          this.selectedMeshDistance = Vector3.Distance(this.selectedMesh.position, controller.pointer.position);
        }
      } else if (this.selectedMesh) {
        // Move selected object so it's always the same distance from controller
        const ray = this.getControllerRay(controller);
        const moveVector = ray.direction.scale(this.selectedMeshDistance);
        this.selectedMesh.position.copyFrom(controller.pointer.position.add(moveVector));
      }
    } else if (controller.userData.trigger.pressedPrev) {
      // Trigger released
      if (this.selectedMesh != null) {
        this.selectedMesh.material.diffuseColor = objectUnselectedColor;
        this.selectedMesh = null;
      }
    }
    controller.userData.trigger.pressedPrev = controller.userData.trigger.pressed;
  }

  getControllerRay(controller) {
    const ray = new Ray(new Vector3(), new Vector3());
    controller.getWorldPointerRayToRef(ray);
    return ray;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});