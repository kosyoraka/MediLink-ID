package savingscontrol.savings;

import javafx.application.Application;
import javafx.geometry.HPos;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.GridPane;
import javafx.stage.Stage;


public class SavingsCalculator extends Application {
    private TextField tfProjectedSavings = new TextField();
    private TextField tfIncomeAmount = new TextField();
    private TextField tfTotalExpenses = new TextField();
    private TextField tfActualSavings = new TextField();
    private Button btCalculate = new Button("Calculate");

    public static void main(String[] args) {
        launch(args);
    }
    @Override
    public void start(Stage primaryStage) {
        GridPane gridPane = new GridPane();
        gridPane.setHgap(5);
        gridPane.setVgap(5);
        gridPane.add(new Label("Savings Goal: "), 0, 0);
        gridPane.add(tfProjectedSavings, 1, 0);
        gridPane.add(new Label("Income Amount: "), 0, 1);
        gridPane.add(tfIncomeAmount, 1, 1);
        gridPane.add(new Label("Total Expenses: "), 0, 2);
        gridPane.add(tfTotalExpenses, 1, 2);
        gridPane.add(new Label("Actual Savings Calculated: "), 0, 4);
        gridPane.add(tfActualSavings, 1, 4);
        gridPane.add(btCalculate, 1, 3);
        gridPane.setAlignment(Pos.BASELINE_CENTER);

        tfProjectedSavings.setAlignment(Pos.BOTTOM_RIGHT);
        tfIncomeAmount.setAlignment(Pos.BOTTOM_RIGHT);
        tfTotalExpenses.setAlignment(Pos.BOTTOM_RIGHT);
        tfActualSavings.setAlignment(Pos.BOTTOM_RIGHT);
        tfActualSavings.setEditable(false);
        GridPane.setHalignment(btCalculate, HPos.RIGHT);

        Scene scene = new Scene(gridPane, 400, 250);

        btCalculate.setOnAction(e -> calculateSavings());

        primaryStage.setTitle("Savings Calculator");
        primaryStage.setScene(scene);
        primaryStage.show();
    }
    private void calculateSavings() {
        double projAmt = Double.parseDouble(tfProjectedSavings.getText());
        double income = Double.parseDouble(tfIncomeAmount.getText());
        double expenses = Double.parseDouble(tfTotalExpenses.getText());
        double value = income - expenses;
        tfActualSavings.setText(String.format("%.2f", value));
    }
}
