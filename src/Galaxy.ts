import * as THREE from 'three';
import { Flag } from './Flag.ts';
import { Planet } from './Planet.ts';
import { Player } from './Player.ts';
import { RayCastableInterface } from './RayCastableInterface.ts';
import { Scene } from './Scene.ts';
import { Star } from './Star.ts';
import { Utils } from './Utils.ts';

export class Galaxy {
    private radius: number;
    private allStars: Star[];
    private allPlanets: Planet[];
    private player: Player | null;

    private lastRayCastTime: number;

    private currHoldFlag: Flag | null;
    private currFlag: Flag | null;

    private rayCastedObjects: RayCastableInterface[];

    constructor(radius: number) {
        this.radius = radius;
        this.allStars = [];
        this.allPlanets = [];
        this.player = null;

        this.lastRayCastTime = 0;

        this.currHoldFlag = null;
        this.currFlag = null;
    
        this.rayCastedObjects = [];
    }

    addBackgroundImg(backgroundPath: string) {
        let backgroundMesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 160, 160),
            new THREE.MeshStandardMaterial({ 
                map: Utils.textureLoader.load(backgroundPath),
                side: THREE.BackSide
              })
        );
        Scene.addEntity(backgroundMesh);
    }

    addStars(nStars: number, modelPath: string): void {
        Utils.gltfLoader.load(modelPath, ( gltf ) => {
            let baseStarModel = gltf.scene;
            Utils.setEmissiveGLTF(baseStarModel, 52);
            for (let i = 0; i < nStars; i++) {
                let currStar: Star = new Star(baseStarModel.clone(),
                    THREE.MathUtils.randFloat(0.004, 0.02),
                    THREE.MathUtils.randFloat(0.0001, 0.001),
                    Utils.getRandomVector3Spread(this.radius / 1.2));

                    this.allStars.push(currStar);
            }
        });
    }

    addPlanet(planet: Planet) {
        this.allPlanets.push(planet);
    }

    setPlayer(player: Player) {
        this.player = player;
    }

    getPlayer(): Player | null {
        return this.player;
    }

    updateCurrentHoldFlag(): void {
        this.rayCastObjects(true);
        this.currHoldFlag = this.currFlag;
    }

    rayCastObjects(justFindFirstFlag: boolean = false, 
            justFindFirstObject: boolean = false): boolean {
        Utils.rayCaster.setFromCamera(Utils.mousePosition, Scene.camera);
        const intersected = Utils.rayCaster.intersectObjects(Scene.getChildren());

        let foundFlag = false;
        const currCastedObjects: RayCastableInterface[] = []

        for (let i = 0; i < intersected.length; i++) {
            const obj = intersected[i].object;

            if (Utils.implementsRayCastable(obj)) {
                if (justFindFirstObject) return true;

                if (obj instanceof Flag) {
                    if (foundFlag) continue;
                    this.currFlag = obj as Flag;
                    foundFlag = true;

                    if (justFindFirstFlag) return true;
                }

                // @ts-ignore
                const castedObj = obj as RayCastableInterface;
                let rayCastOK = true;
                if (!this.rayCastedObjects.includes(castedObj)) {
                    rayCastOK = castedObj.onRayCast();
                }
                if (rayCastOK) currCastedObjects.push(castedObj);

            }
        }

        if (!foundFlag) this.currFlag = null;

        if (justFindFirstFlag) return false;

        for (const lastCastedObj of this.rayCastedObjects) {
            if (!currCastedObjects.includes(lastCastedObj)) {
                lastCastedObj.onRayCastLeave();
            }
        }

        this.rayCastedObjects = currCastedObjects;

        return (this.rayCastedObjects.length != 0);
    }

    rayCast(): void {
        let currTime = Utils.getTime();
        if (currTime - this.lastRayCastTime < 20) return;

        this.rayCastObjects();

        this.lastRayCastTime = currTime;
    }

    checkFlagOnMouseUp(): void {
        if (this.currHoldFlag != null) {
            if(this.rayCastObjects(true) && this.currHoldFlag == this.currFlag) {
                this.currHoldFlag.onClick();
            }
        }
    }

    updateFrame(): void {
        this.rayCast();

        for (const currStar of this.allStars) {
            currStar.updateFrame();
        }
        for (const currPlanet of this.allPlanets) {
            currPlanet.updateFrame();
        }
        if (this.player != null) this.player.updateFrame();
    }
    
}
