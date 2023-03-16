import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Seamless Multichain Integration',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Arkiver enables developers to effortlessly query and index data from multiple blockchains using a single, coherent interface. Simplify your workflow and reduce the complexity of integrating various blockchain technologies into your applications with Arkiver's end-to-end blockchain indexing solution.
      </>
    ),
  },
  {
    title: 'Customizable Data Processing',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Unleash your creativity by defining custom data processing functions in TypeScript. Arkiver's flexible architecture allows you to tailor your data transformations to suit your specific needs, providing you with valuable insights and maximizing the potential of blockchain data in your applications.
      </>
    ),
  },
  {
    title: 'Efficient Data Storage and Retrieval',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Arkiver's efficient data storage and retrieval system are powered by a GraphQL API, allowing you to query only the data you need when you need it. With optimized handler functions and caching mechanisms, Arkiver ensures high-performance data access, making your applications more responsive and user-friendly.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
