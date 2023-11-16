import React, {FunctionComponent, useMemo} from 'react';
import {PageWithScrollView} from '../../../components/page';

import {observer} from 'mobx-react-lite';
import {Text} from 'react-native';
import {useStore} from '../../../stores';
import {RouteProp, useRoute} from '@react-navigation/native';
import {StakeNavigation} from '../../../navigation';
import {Staking} from '@keplr-wallet/stores';
import {ValidatorItem, ViewValidator} from '../components/validator-item';
import {useStyle} from '../../../styles';
import {Box} from '../../../components/box';
import {CollapsibleList} from '../../../components/collapsible-list';
import {TokenTitleView} from '../../home/components/token';
import {Column, Columns} from '../../../components/column';
import {StakingIcon} from '../../../components/icon/stacking';
import {Gutter} from '../../../components/gutter';
import {YAxis} from '../../../components/axis';
import {Button} from '../../../components/button';
import LinearGradient from 'react-native-linear-gradient';
import {CoinPretty} from '@keplr-wallet/unit';
import {formatRelativeTime} from '../../../utils/format';
import {useIntl} from 'react-intl';

export const StakingDashboardScreen: FunctionComponent = observer(() => {
  const {accountStore, queriesStore, priceStore, chainStore} = useStore();
  const style = useStyle();
  const route = useRoute<RouteProp<StakeNavigation, 'Stake.Dashboard'>>();
  const intl = useIntl();
  // const style = useStyle();
  const {chainId} = route.params;
  const stakbleToken = queriesStore
    .get(chainId)
    .queryBalances.getQueryBech32Address(
      accountStore.getAccount(chainId).bech32Address,
    ).stakable?.balance;

  const account = accountStore.getAccount(chainId);
  const queries = queriesStore.get(chainId);
  const chainInfo = chainStore.getChain(chainId);

  const staked = queries.cosmos.queryDelegations.getQueryBech32Address(
    account.bech32Address,
  ).total;
  const totalStakedPrice = staked
    ? priceStore.calculatePrice(staked)
    : undefined;

  const bondedValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Bonded,
  );
  const unbondingValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Unbonding,
  );
  const unbondedValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Unbonded,
  );

  const validators = useMemo(() => {
    return bondedValidators.validators
      .concat(unbondingValidators.validators)
      .concat(unbondedValidators.validators);
  }, [
    bondedValidators.validators,
    unbondingValidators.validators,
    unbondedValidators.validators,
  ]);

  const validatorsMap = useMemo(() => {
    const map: Map<string, Staking.Validator> = new Map();

    for (const val of validators) {
      map.set(val.operator_address, val);
    }

    return map;
  }, [validators]);

  const queryDelegations =
    queries.cosmos.queryDelegations.getQueryBech32Address(
      account.bech32Address,
    );
  const queryUnbondings =
    queries.cosmos.queryUnbondingDelegations.getQueryBech32Address(
      account.bech32Address,
    );

  const unbondings: ViewValidator[] = useMemo(() => {
    const res = [];
    for (const unbonding of queryUnbondings.unbondings) {
      for (const entry of unbonding.entries) {
        if (!chainInfo.stakeCurrency) {
          continue;
        }
        if (!chainInfo.stakeCurrency) {
          continue;
        }
        const validator = validatorsMap.get(unbonding.validator_address);
        if (!validator) {
          continue;
        }

        const thumbnail =
          bondedValidators.getValidatorThumbnail(validator.operator_address) ||
          unbondingValidators.getValidatorThumbnail(
            validator.operator_address,
          ) ||
          unbondedValidators.getValidatorThumbnail(validator.operator_address);

        const balance = new CoinPretty(chainInfo.stakeCurrency, entry.balance);
        const relativeTime = formatRelativeTime(entry.completion_time);

        res.push({
          coin: balance,
          imageUrl: thumbnail,
          name: validator.description.moniker,
          validatorAddress: unbonding.validator_address,
          subString: intl.formatRelativeTime(
            relativeTime.value,
            relativeTime.unit,
          ),
        });
      }
    }
    return res;
  }, [
    bondedValidators,
    chainInfo.stakeCurrency,
    intl,
    queryUnbondings.unbondings,
    unbondedValidators,
    unbondingValidators,
    validatorsMap,
  ]);

  const delegations: ViewValidator[] = useMemo(() => {
    const res: ViewValidator[] = [];
    for (let delegation of queryDelegations.delegations) {
      const validator = validatorsMap.get(
        delegation.delegation.validator_address,
      );
      if (!validator) {
        continue;
      }

      const thumbnail =
        bondedValidators.getValidatorThumbnail(validator.operator_address) ||
        unbondingValidators.getValidatorThumbnail(validator.operator_address) ||
        unbondedValidators.getValidatorThumbnail(validator.operator_address);

      const amount = queryDelegations.getDelegationTo(
        validator.operator_address,
      );

      res.push({
        coin: amount,
        imageUrl: thumbnail,
        name: validator.description.moniker,
        validatorAddress: delegation.delegation.validator_address,
        subString: amount
          ? priceStore.calculatePrice(amount)?.inequalitySymbol(true).toString()
          : undefined,
      });
    }
    return res;
  }, [
    bondedValidators,
    priceStore,
    queryDelegations,
    unbondedValidators,
    unbondingValidators,
    validatorsMap,
  ]);

  const ValidatorViewData: {
    title: string;
    balance: ViewValidator[];
    lenAlwaysShown: number;
  }[] = [
    {
      title: 'Staked Balance',
      balance: delegations,
      lenAlwaysShown: 4,
    },
    {
      title: 'Unstaking Balance',
      balance: unbondings,
      lenAlwaysShown: 4,
    },
  ];

  return (
    <PageWithScrollView backgroundMode="default">
      <Box
        alignX="center"
        padding={20}
        style={style.flatten(['margin-left-16'])}>
        <Text style={style.flatten(['h5', 'color-text-high'])}>
          {staked?.maxDecimals(6).trim(true).shrink(true).toString()}
        </Text>
        <Text style={style.flatten(['h5', 'color-text-high'])}>
          {totalStakedPrice?.inequalitySymbol(true).toString()}
        </Text>
      </Box>
      <Box
        padding={16}
        borderRadius={8}
        backgroundColor={style.get('color-gray-600').color}>
        <Columns sum={1} alignY="center" gutter={8}>
          <Columns sum={1} gutter={12} alignY="center">
            <LinearGradient
              colors={['rgba(113,196,255,0.4)', 'rgba(211,120,254,0.4)']}
              style={style.flatten([
                'border-radius-64',
                'width-36',
                'height-36',
              ])}>
              <Box alignX="center" alignY="center" width={36} height={36}>
                <StakingIcon size={18} color={style.get('color-white').color} />
              </Box>
            </LinearGradient>

            <YAxis>
              <Text style={style.flatten(['subtitle4', 'color-text-low'])}>
                Available for Staking
              </Text>
              <Gutter size={4} />
              <Text
                numberOfLines={1}
                style={style.flatten(['subtitle2', 'color-text-high'])}>
                {stakbleToken
                  ?.maxDecimals(6)
                  .inequalitySymbol(true)
                  .shrink(true)
                  .toString()}
              </Text>
            </YAxis>
          </Columns>
          <Column weight={1} />
          <Button
            style={style.flatten(['padding-x-16', 'padding-y-8'])}
            text="Stake"
            size="small"
          />
        </Columns>
      </Box>

      {ValidatorViewData.map(({title, balance, lenAlwaysShown}) => {
        if (balance.length === 0) {
          return null;
        }
        return (
          <React.Fragment key={title}>
            <Gutter size={12} />
            <CollapsibleList
              title={<TokenTitleView title={title} />}
              lenAlwaysShown={lenAlwaysShown}
              items={balance.map(del => {
                return (
                  <ValidatorItem
                    viewValidator={{
                      coin: del.coin,
                      imageUrl: del.imageUrl,
                      name: del.name,
                      validatorAddress: del.validatorAddress,
                      subString: del.subString,
                    }}
                    key={del.validatorAddress + del.subString}
                    chainId={chainId}
                    afterSelect={() => {
                      console.log('click');
                    }}
                  />
                );
              })}
            />
          </React.Fragment>
        );
      })}
    </PageWithScrollView>
  );
});
