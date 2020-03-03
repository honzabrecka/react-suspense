import React from "react";
import "./App.css";

class Suspense extends React.Component {
  constructor(props) {
    super(props);
    this.state = { pending: false };
    this.mounted = true;
  }

  componentDidCatch(error, info) {
    if (
      !this.state.pending &&
      error.pendingResource &&
      typeof error.pendingResource.then === "function"
    ) {
      this.setState({ pending: true });
      error.pendingResource.then(() => {
        if (this.mounted) this.setState({ pending: false });
      });
      return;
    }
    throw error;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    if (this.state.pending) return this.props.fallback;
    return this.props.children;
  }
}

function wrapPromise(promise) {
  let state = "pending";
  let error = null;
  let data = null;

  promise
    .then(x => {
      data = x;
      state = "resolved";
    })
    .catch(e => {
      error = e;
      state = "rejected";
    });

  /**
   * This is workaround, because componentDidCatch can not catch (ignores)
   * thrown promise. Therefore promise needs to be wrapped with an Error.
   */
  const throwPromise = () => {
    const p = new Error("pending resource");
    p.pendingResource = promise;
    throw p;
  };

  return {
    read() {
      if (state === "pending") throwPromise();
      if (state === "rejected") throw error;
      return data;
    }
  };
}

const delay = t => new Promise(resolve => setTimeout(resolve, t));

const createResource = (data, t) => wrapPromise(delay(t).then(() => data));

function X({ resource }) {
  const data = resource.read();
  return <div>{data}</div>;
}

function App() {
  const [resource, setResource] = React.useState(() =>
    createResource("hello", 1000)
  );
  const [mounted, setMounted] = React.useState(true);

  return (
    <>
      <button onClick={() => setResource(createResource("foo", 5000))}>
        foo click
      </button>
      <button onClick={() => setResource(createResource("bar", 2000))}>
        bar click
      </button>
      <button onClick={() => setMounted(false)}>unmount</button>

      {mounted && (
        <Suspense fallback="loading...">
          <X resource={resource} />
        </Suspense>
      )}
    </>
  );
}

export default App;
