package ge.levannatsvlishvili;

import software.amazon.awscdk.App;
import software.amazon.awscdk.StackProps;

public class InfraApp {
    public static void main(final String[] args) {
        App app = new App();
        new InfraStack(app, "InfraStack", StackProps.builder().build());
        app.synth();
    }
}

