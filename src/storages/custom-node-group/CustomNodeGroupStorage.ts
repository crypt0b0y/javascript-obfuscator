import { injectable, inject } from 'inversify';
import { ServiceIdentifiers } from '../../container/ServiceIdentifiers';

import { TCustomNodeGroupFactory } from '../../types/container/custom-nodes/TCustomNodeGroupFactory';

import { ICustomNodeGroup } from '../../interfaces/custom-nodes/ICustomNodeGroup';
import { IOptions } from '../../interfaces/options/IOptions';

import { CustomNodeGroup } from '../../enums/container/custom-nodes/CustomNodeGroup';

import { MapStorage } from '../MapStorage';
import { RandomGeneratorUtils } from '../../utils/RandomGeneratorUtils';

@injectable()
export class CustomNodeGroupStorage extends MapStorage <ICustomNodeGroup> {
    /**
     * @type {CustomNodeGroup[]}
     */
    private static readonly customNodeGroupsList: CustomNodeGroup[] = [
        CustomNodeGroup.ConsoleOutputCustomNodeGroup,
        CustomNodeGroup.DebugProtectionCustomNodeGroup,
        CustomNodeGroup.DomainLockCustomNodeGroup,
        CustomNodeGroup.SelfDefendingCustomNodeGroup,
        CustomNodeGroup.StringArrayCustomNodeGroup
    ];

    /**
     * @type {TCustomNodesFactoriesFactory}
     */
    private readonly customNodeGroupFactory: TCustomNodeGroupFactory;

    /**
     * @type {IOptions}
     */
    private readonly options: IOptions;

    /**
     * @param customNodeGroupFactory
     * @param options
     */
    constructor (
        @inject(ServiceIdentifiers.Factory__ICustomNodeGroup) customNodeGroupFactory: TCustomNodeGroupFactory,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super();

        this.customNodeGroupFactory = customNodeGroupFactory;
        this.options = options;

        this.initialize();
    }

    public initialize (): void {
        this.storage = new Map <string, ICustomNodeGroup> ();
        this.storageId = RandomGeneratorUtils.getRandomString(6);

        CustomNodeGroupStorage.customNodeGroupsList.forEach((customNodeGroupName: CustomNodeGroup) => {
            const customNodeGroup: ICustomNodeGroup = this.customNodeGroupFactory(
                customNodeGroupName
            );

            if (!customNodeGroup) {
                return;
            }

            this.storage.set(customNodeGroupName, customNodeGroup);
        });
    }
}
